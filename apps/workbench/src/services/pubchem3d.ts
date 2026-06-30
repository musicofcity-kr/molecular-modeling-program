import type { Molecule3DInput } from '../types/molecule';

export type PubChem3DLoadStatus = 'idle' | 'loading' | 'success' | 'noData' | 'error';

export type PubChem3DLookupInput = {
  cid: number;
  label: string;
  pubchemName?: string;
};

export type PubChem3DLookupResult =
  | {
      ok: true;
      status: 'success';
      molecule3D: Molecule3DInput;
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    }
  | {
      ok: false;
      status: 'noData' | 'error';
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    };

const PUBCHEM_3D_FAILURE_MESSAGE =
  '외부 3D 구조 데이터를 불러오지 못했습니다. 2D 구조 검증 결과는 계속 확인할 수 있습니다.';

const PUBCHEM_3D_NO_DATA_MESSAGE =
  'PubChem에 후보는 있지만 3D 좌표 데이터가 제공되지 않을 수 있습니다. 2D 구조와 분자식 검증 결과는 계속 사용할 수 있습니다.';

const PUBCHEM_3D_SOURCE_NOTE =
  'PubChem PUG-REST에서 CID 기반으로 가져온 3D SDF 좌표입니다. 교육용 시각화 자료이며 분자식, 분자량, 결합각, 결합길이의 기준으로 사용하지 않습니다.';

const RESPONSE_TEXT_LIMIT = 500;

function buildPubChem3DSdfUrl(cid: number): string {
  return `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/record/SDF?record_type=3d`;
}

function excerptResponseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, RESPONSE_TEXT_LIMIT);
}

function hasSdfMolBlock(value: string): boolean {
  return value.includes('M  END');
}

function validateCid(cid: number): string | null {
  if (!Number.isInteger(cid) || cid <= 0) {
    return `Invalid PubChem CID: ${cid}`;
  }

  return null;
}

export async function fetchPubChem3DSdf(
  input: PubChem3DLookupInput,
  fetchImpl: typeof fetch = fetch,
): Promise<PubChem3DLookupResult> {
  const invalidCidReason = validateCid(input.cid);

  if (invalidCidReason) {
    return {
      ok: false,
      status: 'error',
      studentMessage: PUBCHEM_3D_FAILURE_MESSAGE,
      warnings: [],
      developerLogs: [
        'PubChem 3D SDF fetch failed.',
        `CID: ${input.cid}`,
        invalidCidReason,
      ],
    };
  }

  const url = buildPubChem3DSdfUrl(input.cid);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'chemical/x-mdl-sdfile, text/plain;q=0.9, */*;q=0.8',
      },
    });
    const responseText = await response.text();

    if (!response.ok) {
      const status = response.status === 404 ? 'noData' : 'error';

      return {
        ok: false,
        status,
        studentMessage:
          status === 'noData' ? PUBCHEM_3D_NO_DATA_MESSAGE : PUBCHEM_3D_FAILURE_MESSAGE,
        warnings: [],
        developerLogs: [
          'PubChem 3D SDF fetch failed.',
          `CID: ${input.cid}`,
          `HTTP status: ${response.status} ${response.statusText}`.trim(),
          `response text: ${excerptResponseText(responseText)}`,
        ],
      };
    }

    if (!responseText.trim() || !hasSdfMolBlock(responseText)) {
      return {
        ok: false,
        status: 'noData',
        studentMessage: PUBCHEM_3D_NO_DATA_MESSAGE,
        warnings: [],
        developerLogs: [
          'PubChem 3D SDF fetch failed.',
          `CID: ${input.cid}`,
          'response did not contain an SDF mol block.',
          `response text: ${excerptResponseText(responseText)}`,
        ],
      };
    }

    return {
      ok: true,
      status: 'success',
      molecule3D: {
        format: 'sdf',
        data: responseText,
        label: input.label,
        sourceType: 'pubchem',
        coordinateSource: `PubChem CID ${input.cid}`,
        sourceNote: input.pubchemName
          ? `${PUBCHEM_3D_SOURCE_NOTE} PubChem name: ${input.pubchemName}.`
          : PUBCHEM_3D_SOURCE_NOTE,
        sourceUrl: url,
      },
      studentMessage: `${input.label}의 PubChem 3D 구조 데이터를 불러왔습니다.`,
      warnings: [],
      developerLogs: [`PubChem 3D SDF fetch succeeded: CID ${input.cid}.`],
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      studentMessage: PUBCHEM_3D_FAILURE_MESSAGE,
      warnings: [],
      developerLogs: [
        'PubChem 3D SDF fetch failed.',
        `CID: ${input.cid}`,
        `fetch error message: ${
          error instanceof Error ? error.message : 'Unknown fetch error'
        }`,
      ],
    };
  }
}
