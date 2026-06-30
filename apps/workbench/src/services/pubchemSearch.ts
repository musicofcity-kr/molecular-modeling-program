import type {
  PubChemCandidate,
  PubChemCandidateSearchResult,
  PubChemMatchStatus,
  MoleculeValidationResult,
} from '../types/molecule';

type PubChemPropertyRecord = {
  CID?: number;
  Title?: string;
  MolecularFormula?: string;
  MolecularWeight?: string | number;
  CanonicalSMILES?: string;
  IsomericSMILES?: string;
  ConnectivitySMILES?: string;
  SMILES?: string;
};

type PubChemPropertyResponse = {
  PropertyTable?: {
    Properties?: PubChemPropertyRecord[];
  };
};

const PUBCHEM_PROPERTY_ENDPOINT =
  'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/property/Title,MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES/JSON';

type PubChemResolvedMatchStatus = Exclude<
  PubChemMatchStatus,
  'not_requested' | 'searching' | 'error'
>;

const STUDENT_SEARCH_FAILURE_MESSAGE =
  'PubChem 후보 검색 중 오류가 발생했습니다. RDKit.js 검증 결과는 계속 사용할 수 있습니다.';

const RESPONSE_TEXT_LIMIT = 500;
const FORMULA_TOKEN_PATTERN = /([A-Z][a-z]?)(\d*)/g;

function excerptResponseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, RESPONSE_TEXT_LIMIT);
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return undefined;
}

function parsePubChemPropertyResponse(value: string): PubChemPropertyResponse {
  return JSON.parse(value) as PubChemPropertyResponse;
}

function buildStatus(candidateCount: number): PubChemResolvedMatchStatus {
  if (candidateCount === 0) {
    return 'no_match';
  }

  if (candidateCount === 1) {
    return 'single_candidate';
  }

  return 'multiple_candidates';
}

function buildStudentMessage(status: PubChemResolvedMatchStatus): string {
  switch (status) {
    case 'no_match':
      return 'PubChem에서 일치 후보를 찾지 못했습니다.';
    case 'single_candidate':
      return '외부 데이터 후보 1개를 찾았습니다. 자동 선택하지 않고 직접 확인해야 합니다.';
    case 'multiple_candidates':
      return '후보가 여러 개입니다. 표시된 후보 중 하나를 직접 선택하세요.';
  }
}

function mapPubChemCandidate(record: PubChemPropertyRecord): PubChemCandidate | null {
  if (typeof record.CID !== 'number' || !Number.isInteger(record.CID)) {
    return null;
  }

  return {
    cid: record.CID,
    title: record.Title,
    molecularFormula: record.MolecularFormula,
    molecularWeight: toOptionalString(record.MolecularWeight),
    canonicalSmiles: record.CanonicalSMILES ?? record.ConnectivitySMILES ?? record.SMILES,
    isomericSmiles: record.IsomericSMILES ?? record.SMILES,
    source: 'pubchem',
  };
}

function parseFormulaCounts(formula: string): Map<string, number> | null {
  const trimmedFormula = formula.trim();

  if (!trimmedFormula) {
    return null;
  }

  const counts = new Map<string, number>();
  let parsedLength = 0;
  let match: RegExpExecArray | null;

  FORMULA_TOKEN_PATTERN.lastIndex = 0;
  while ((match = FORMULA_TOKEN_PATTERN.exec(trimmedFormula)) !== null) {
    const [, symbol, rawCount] = match;
    const count = rawCount ? Number(rawCount) : 1;

    if (!Number.isFinite(count) || count <= 0) {
      return null;
    }

    parsedLength += match[0].length;
    counts.set(symbol, (counts.get(symbol) ?? 0) + count);
  }

  return parsedLength === trimmedFormula.length ? counts : null;
}

function haveSameFormula(leftFormula: string, rightFormula: string): boolean {
  const leftCounts = parseFormulaCounts(leftFormula);
  const rightCounts = parseFormulaCounts(rightFormula);

  if (!leftCounts || !rightCounts) {
    return leftFormula.trim() === rightFormula.trim();
  }

  if (leftCounts.size !== rightCounts.size) {
    return false;
  }

  for (const [symbol, count] of leftCounts) {
    if (rightCounts.get(symbol) !== count) {
      return false;
    }
  }

  return true;
}

export function evaluatePubChemCandidateForCurrentStructure(
  candidate: PubChemCandidate,
  validationResult: MoleculeValidationResult | null,
): {
  canLoad3D: boolean;
  studentMessage?: string;
  warnings: string[];
  developerLogs: string[];
} {
  if (validationResult?.ok !== true) {
    return {
      canLoad3D: false,
      studentMessage:
        'PubChem 후보를 3D로 불러오려면 먼저 현재 구조가 RDKit.js 검증을 통과해야 합니다.',
      warnings: [],
      developerLogs: [
        'PubChem candidate 3D load blocked: missing valid RDKit result.',
        `candidate CID: ${candidate.cid}`,
      ],
    };
  }

  const developerLogs = [
    'PubChem candidate compatibility check.',
    `candidate CID: ${candidate.cid}`,
    `RDKit formula: ${validationResult.molecularFormula}`,
    `PubChem formula: ${candidate.molecularFormula ?? 'not provided'}`,
    `RDKit canonicalSmiles: ${validationResult.canonicalSmiles}`,
    `PubChem canonicalSmiles: ${candidate.canonicalSmiles ?? 'not provided'}`,
    `PubChem isomericSmiles: ${candidate.isomericSmiles ?? 'not provided'}`,
  ];
  const warnings: string[] = [];

  if (!candidate.molecularFormula) {
    warnings.push(
      'PubChem 후보의 분자식이 제공되지 않았습니다. 외부 데이터 후보로만 확인하세요.',
    );

    return {
      canLoad3D: true,
      warnings,
      developerLogs: [
        ...developerLogs,
        'candidate allowed with warning: PubChem formula not provided.',
      ],
    };
  }

  if (!haveSameFormula(validationResult.molecularFormula, candidate.molecularFormula)) {
    return {
      canLoad3D: false,
      studentMessage:
        '선택한 PubChem 후보의 분자식이 현재 RDKit.js 검증 결과와 달라 3D 불러오기를 중단했습니다.',
      warnings: [
        `RDKit.js 분자식: ${validationResult.molecularFormula}`,
        `PubChem 후보 분자식: ${candidate.molecularFormula}`,
      ],
      developerLogs: [...developerLogs, 'candidate blocked: formula mismatch.'],
    };
  }

  if (
    candidate.canonicalSmiles &&
    candidate.canonicalSmiles !== validationResult.canonicalSmiles
  ) {
    warnings.push(
      'PubChem SMILES 표기가 RDKit.js canonical SMILES와 다를 수 있습니다. 분자식 검증값은 RDKit.js 결과를 기준으로 유지합니다.',
    );
  }

  return {
    canLoad3D: true,
    warnings,
    developerLogs: [...developerLogs, 'candidate allowed: formula compatible.'],
  };
}

export async function searchPubChemCandidatesByCanonicalSmiles(
  canonicalSmiles: string,
  fetchImpl: typeof fetch = fetch,
): Promise<PubChemCandidateSearchResult> {
  const trimmedCanonicalSmiles = canonicalSmiles.trim();

  if (!trimmedCanonicalSmiles) {
    return {
      ok: false,
      status: 'error',
      candidates: [],
      studentMessage: STUDENT_SEARCH_FAILURE_MESSAGE,
      warnings: [],
      developerLogs: [
        'PubChem candidate search failed before request: empty canonicalSmiles.',
      ],
    };
  }

  try {
    const body = new URLSearchParams({ smiles: trimmedCanonicalSmiles }).toString();
    const response = await fetchImpl(PUBCHEM_PROPERTY_ENDPOINT, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const responseText = await response.text();

    if (!response.ok) {
      if (response.status === 404) {
        return {
          ok: true,
          status: 'no_match',
          candidates: [],
          studentMessage: buildStudentMessage('no_match'),
          warnings: [],
          developerLogs: [
            'PubChem candidate search returned no match.',
            `canonicalSmiles: ${trimmedCanonicalSmiles}`,
            'endpoint type: compound/smiles/property',
            `HTTP status: ${response.status} ${response.statusText}`.trim(),
            `response text: ${excerptResponseText(responseText)}`,
            'candidate CIDs: none',
          ],
        };
      }

      return {
        ok: false,
        status: 'error',
        candidates: [],
        studentMessage: STUDENT_SEARCH_FAILURE_MESSAGE,
        warnings: [],
        developerLogs: [
          'PubChem candidate search failed.',
          `canonicalSmiles: ${trimmedCanonicalSmiles}`,
          'endpoint type: compound/smiles/property',
          `HTTP status: ${response.status} ${response.statusText}`.trim(),
          `response text: ${excerptResponseText(responseText)}`,
        ],
      };
    }

    const parsedResponse = parsePubChemPropertyResponse(responseText);
    const candidates =
      parsedResponse.PropertyTable?.Properties?.map(mapPubChemCandidate).filter(
        (candidate): candidate is PubChemCandidate => candidate !== null,
      ) ?? [];
    const status = buildStatus(candidates.length);

    return {
      ok: true,
      status,
      candidates,
      studentMessage: buildStudentMessage(status),
      warnings:
        candidates.length > 0
          ? ['외부 데이터 후보이므로 수업용 시각화 자료로만 사용하세요.']
          : [],
      developerLogs: [
        'PubChem candidate search succeeded.',
        `canonicalSmiles: ${trimmedCanonicalSmiles}`,
        'endpoint type: compound/smiles/property',
        `candidate CIDs: ${
          candidates.length > 0
            ? candidates.map((candidate) => candidate.cid).join(', ')
            : 'none'
        }`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      candidates: [],
      studentMessage: STUDENT_SEARCH_FAILURE_MESSAGE,
      warnings: [],
      developerLogs: [
        'PubChem candidate search failed.',
        `canonicalSmiles: ${trimmedCanonicalSmiles}`,
        'endpoint type: compound/smiles/property',
        `error message: ${
          error instanceof Error ? error.message : 'Unknown PubChem search error'
        }`,
      ],
    };
  }
}
