import { describe, expect, it, vi } from 'vitest';
import { fetchPubChem3DSdf } from './pubchem3d';

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

describe('fetchPubChem3DSdf', () => {
  it('returns a PubChem-labeled Molecule3DInput for a successful 3D SDF response', async () => {
    const sdf = `water PubChem 3D
  PubChem

  3  2  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    0.9572    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.2390    0.9270    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
M  END
$$$$`;
    const fetchImpl = vi.fn().mockResolvedValue(createResponse(sdf, { ok: true, status: 200 }));

    const result = await fetchPubChem3DSdf(
      { cid: 962, label: '물', pubchemName: 'Water' },
      fetchImpl,
    );

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/962/record/SDF?record_type=3d',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.status).toBe('success');
      expect(result.molecule3D).toMatchObject({
        format: 'sdf',
        data: sdf,
        label: '물',
        sourceType: 'pubchem',
        coordinateSource: 'PubChem CID 962',
      });
      expect(result.molecule3D.sourceUrl).toBeUndefined();
      expect(result.molecule3D.sourceNote).toContain('교육용 시각화 자료');
      expect(result.developerLogs).toContain('PubChem 3D SDF fetch succeeded: CID 962.');
    }
  });

  it('returns noData with separated student and developer messages when PubChem has no 3D SDF', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        createResponse('PUGREST.NotFound: No 3D conformer available', {
          ok: false,
          status: 404,
          statusText: 'Not Found',
        }),
      );

    const result = await fetchPubChem3DSdf({ cid: 123, label: '테스트' }, fetchImpl);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('noData');
    expect(result.studentMessage).toContain(
      'PubChem에서 이 분자의 3D 구조 데이터를 불러오지 못했습니다.',
    );
    expect(result.studentMessage).toContain(
      '2D 구조와 분자식 검증 결과는 계속 사용할 수 있습니다.',
    );
    expect(result.developerLogs.join('\n')).toContain('HTTP status: 404');
    expect(result.developerLogs.join('\n')).toContain('No 3D conformer available');
  });

  it('returns error when the network request fails', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network unavailable'));

    const result = await fetchPubChem3DSdf({ cid: 702, label: '에탄올' }, fetchImpl);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('error');
    expect(result.studentMessage).toContain(
      'PubChem에서 이 분자의 3D 구조 데이터를 불러오지 못했습니다.',
    );
    expect(result.developerLogs).toEqual([
      'PubChem 3D SDF fetch failed.',
      'CID: 702',
      'fetch error message: network unavailable',
    ]);
  });
});
