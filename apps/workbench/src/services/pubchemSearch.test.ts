import { describe, expect, it, vi } from 'vitest';
import { searchPubChemCandidatesByCanonicalSmiles } from './pubchemSearch';

function createResponse(
  body: string,
  init: { ok: boolean; status: number; statusText?: string },
): Response {
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? '',
    text: () => Promise.resolve(body),
  } as Response;
}

describe('searchPubChemCandidatesByCanonicalSmiles', () => {
  it('maps PubChem property records into external data candidates', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createResponse(
        JSON.stringify({
          PropertyTable: {
            Properties: [
              {
                CID: 702,
                Title: 'Ethanol',
                MolecularFormula: 'C2H6O',
                MolecularWeight: '46.069',
                CanonicalSMILES: 'CCO',
                IsomericSMILES: 'CCO',
              },
            ],
          },
        }),
        { ok: true, status: 200 },
      ),
    );

    const result = await searchPubChemCandidatesByCanonicalSmiles('CCO', fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/property/Title,MolecularFormula,MolecularWeight,CanonicalSMILES,IsomericSMILES/JSON',
      expect.objectContaining({
        method: 'POST',
        body: 'smiles=CCO',
      }),
    );
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.status).toBe('single_candidate');
      expect(result.candidates).toEqual([
        {
          cid: 702,
          title: 'Ethanol',
          molecularFormula: 'C2H6O',
          molecularWeight: '46.069',
          canonicalSmiles: 'CCO',
          isomericSmiles: 'CCO',
          source: 'pubchem',
        },
      ]);
      expect(result.studentMessage).toContain('외부 데이터 후보');
      expect(result.developerLogs).toContain('PubChem candidate search succeeded.');
      expect(result.developerLogs).toContain('candidate CIDs: 702');
    }
  });

  it('returns no_match when PubChem responds with an empty property table', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        createResponse(JSON.stringify({ PropertyTable: { Properties: [] } }), {
          ok: true,
          status: 200,
        }),
      );

    const result = await searchPubChemCandidatesByCanonicalSmiles('C1CC1', fetchImpl);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.status).toBe('no_match');
      expect(result.candidates).toEqual([]);
      expect(result.studentMessage).toBe('PubChem에서 일치 후보를 찾지 못했습니다.');
      expect(result.developerLogs).toContain('candidate CIDs: none');
    }
  });

  it('treats PubChem 404 as no_match instead of a search crash', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        createResponse('PUGREST.NotFound: no compounds found', {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      );

    const result = await searchPubChemCandidatesByCanonicalSmiles('C1CC1', fetchImpl);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.status).toBe('no_match');
      expect(result.candidates).toEqual([]);
      expect(result.studentMessage).toBe('PubChem에서 일치 후보를 찾지 못했습니다.');
      expect(result.developerLogs.join('\n')).toContain('HTTP status: 404 Not Found');
    }
  });

  it('separates student and developer messages for HTTP failures', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        createResponse('PUGREST.BadRequest: invalid smiles', {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        }),
      );

    const result = await searchPubChemCandidatesByCanonicalSmiles('bad smiles', fetchImpl);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    expect(result.studentMessage).toBe(
      'PubChem 후보 검색 중 오류가 발생했습니다. RDKit.js 검증 결과는 계속 사용할 수 있습니다.',
    );
    expect(result.developerLogs.join('\n')).toContain('HTTP status: 400 Bad Request');
    expect(result.developerLogs.join('\n')).toContain('PUGREST.BadRequest');
  });

  it('returns error without requesting PubChem when canonicalSmiles is empty', async () => {
    const fetchImpl = vi.fn();

    const result = await searchPubChemCandidatesByCanonicalSmiles('   ', fetchImpl);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    expect(result.developerLogs).toContain(
      'PubChem candidate search failed before request: empty canonicalSmiles.',
    );
  });
});
