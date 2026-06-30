import type {
  PubChemCandidate,
  PubChemCandidateSearchResult,
  PubChemMatchStatus,
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
