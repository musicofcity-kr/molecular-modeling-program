import { describe, expect, it, vi } from 'vitest';
import {
  extractStructureFromKetcher,
  hasExtractedStructure,
  normalizeKetcherError,
  type KetcherStructureReader,
} from './ketcher-structure-extraction';

function createReader(overrides: Partial<KetcherStructureReader> = {}): KetcherStructureReader {
  return {
    getSmiles: vi.fn().mockResolvedValue('CCO'),
    getMolfile: vi.fn().mockResolvedValue('ethanol mol block'),
    ...overrides,
  };
}

describe('extractStructureFromKetcher', () => {
  it('returns data that matches the MoleculeInput contract', async () => {
    const reader = createReader();

    const result = await extractStructureFromKetcher(reader);

    expect(result).toMatchObject({
      source: 'ketcher',
      validationStatus: 'unvalidated',
      smiles: 'CCO',
      molBlock: 'ethanol mol block',
    });
    expect(result.extractedAt).toBeTruthy();
    expect(reader.getMolfile).toHaveBeenCalledWith('v2000');
  });

  it('fails empty structures with a classroom-facing message', async () => {
    const reader = createReader({
      getSmiles: vi.fn().mockResolvedValue(''),
      getMolfile: vi.fn().mockResolvedValue(''),
    });

    await expect(extractStructureFromKetcher(reader)).rejects.toThrow(
      '구조를 먼저 그려주세요.',
    );
  });

  it('treats an empty V2000 MOL block as an empty structure', async () => {
    const reader = createReader({
      getSmiles: vi.fn().mockResolvedValue(''),
      getMolfile: vi.fn().mockResolvedValue(
        [
          'Ketcher  6292621122D 1   1.00000     0.00000     0',
          '',
          '  0  0  0  0  0  0  0  0  0  0999 V2000',
          'M  END',
        ].join('\n'),
      ),
    });

    await expect(extractStructureFromKetcher(reader)).rejects.toThrow(
      '구조를 먼저 그려주세요.',
    );
  });

  it('reports SMILES extraction failure explicitly', async () => {
    const reader = createReader({
      getSmiles: vi.fn().mockRejectedValue(new Error('SMILES unavailable')),
    });

    await expect(extractStructureFromKetcher(reader)).rejects.toThrow(
      'SMILES 데이터를 가져오지 못했습니다: SMILES unavailable',
    );
  });

  it('reports MOL block extraction failure explicitly', async () => {
    const reader = createReader({
      getMolfile: vi.fn().mockRejectedValue(new Error('MOL unavailable')),
    });

    await expect(extractStructureFromKetcher(reader)).rejects.toThrow(
      'MOL block 데이터를 가져오지 못했습니다: MOL unavailable',
    );
  });
});

describe('normalizeKetcherError', () => {
  it('falls back for unknown error values', () => {
    expect(normalizeKetcherError(null, 'fallback')).toBe('fallback');
  });
});

describe('hasExtractedStructure', () => {
  it('accepts V2000 MOL blocks with atom counts', () => {
    expect(
      hasExtractedStructure('', '  2  1  0  0  0  0  0  0  0  0999 V2000\nM  END'),
    ).toBe(true);
  });

  it('rejects V2000 MOL blocks with zero atoms', () => {
    expect(
      hasExtractedStructure('', '  0  0  0  0  0  0  0  0  0  0999 V2000\nM  END'),
    ).toBe(false);
  });
});
