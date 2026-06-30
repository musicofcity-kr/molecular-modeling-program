import { describe, expect, it, vi } from 'vitest';
import {
  evaluatePubChemCandidateForCurrentStructure,
  searchPubChemCandidatesByCanonicalSmiles,
} from './pubchemSearch';

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

describe('evaluatePubChemCandidateForCurrentStructure', () => {
  it('allows formula-compatible candidates even when formula order differs', () => {
    const result = evaluatePubChemCandidateForCurrentStructure(
      {
        cid: 222,
        title: 'Ammonia',
        molecularFormula: 'NH3',
        molecularWeight: '17.031',
        canonicalSmiles: 'N',
        source: 'pubchem',
      },
      {
        ok: true,
        validationStatus: 'valid',
        source: 'smiles',
        smiles: 'N',
        canonicalSmiles: 'N',
        molecularFormula: 'H3N',
        molecularWeight: 17.031,
        warnings: [],
        errors: [],
        developerLogs: [],
      },
    );

    expect(result.canLoad3D).toBe(true);
    expect(result.structureMatchStatus).toBe('verified');
    expect(result.developerLogs).toContain('candidate allowed: verified.');
  });

  it('marks formula-compatible but different canonical SMILES candidates as not comparison-verified', () => {
    const result = evaluatePubChemCandidateForCurrentStructure(
      {
        cid: 999,
        title: 'Formula-compatible candidate',
        molecularFormula: 'C2H6O',
        molecularWeight: '46.069',
        canonicalSmiles: 'COC',
        source: 'pubchem',
      },
      {
        ok: true,
        validationStatus: 'valid',
        source: 'smiles',
        smiles: 'CCO',
        canonicalSmiles: 'CCO',
        molecularFormula: 'C2H6O',
        molecularWeight: 46.069,
        warnings: [],
        errors: [],
        developerLogs: [],
      },
    );

    expect(result.canLoad3D).toBe(true);
    expect(result.structureMatchStatus).toBe('formula-compatible');
    expect(result.warnings.join('\n')).toContain('PubChem SMILES 표기');
  });

  it('blocks PubChem 3D loading when the candidate formula conflicts with RDKit', () => {
    const result = evaluatePubChemCandidateForCurrentStructure(
      {
        cid: 123,
        title: 'Wrong candidate',
        molecularFormula: 'C2H6O',
        molecularWeight: '46.069',
        canonicalSmiles: 'CCO',
        source: 'pubchem',
      },
      {
        ok: true,
        validationStatus: 'valid',
        source: 'smiles',
        smiles: 'O',
        canonicalSmiles: 'O',
        molecularFormula: 'H2O',
        molecularWeight: 18.015,
        warnings: [],
        errors: [],
        developerLogs: [],
      },
    );

    expect(result.canLoad3D).toBe(false);
    expect(result.studentMessage).toContain('분자식이 현재 RDKit.js 검증 결과와 달라');
    expect(result.warnings).toContain('RDKit.js 분자식: H2O');
    expect(result.warnings).toContain('PubChem 후보 분자식: C2H6O');
    expect(result.developerLogs).toContain('candidate blocked: formula mismatch.');
  });

  it('blocks candidate loading without a valid RDKit result', () => {
    const result = evaluatePubChemCandidateForCurrentStructure(
      {
        cid: 702,
        title: 'Ethanol',
        molecularFormula: 'C2H6O',
        source: 'pubchem',
      },
      null,
    );

    expect(result.canLoad3D).toBe(false);
    expect(result.studentMessage).toContain('RDKit.js 검증을 통과해야 합니다');
  });
});
