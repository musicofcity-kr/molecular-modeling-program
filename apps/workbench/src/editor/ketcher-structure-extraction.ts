import type { ExtractedStructureData } from './chemical-editor-handle';

export type KetcherStructureReader = {
  getSmiles(): Promise<string>;
  getMolfile(format?: 'v2000' | 'v3000'): Promise<string>;
};

export function normalizeKetcherError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

async function readKetcherText(
  label: 'SMILES' | 'MOL block',
  read: () => Promise<string>,
): Promise<string> {
  try {
    const value = await read();

    if (typeof value !== 'string') {
      throw new Error(`${label} 데이터 형식이 올바르지 않습니다.`);
    }

    return value;
  } catch (error) {
    throw new Error(
      `${label} 데이터를 가져오지 못했습니다: ${normalizeKetcherError(
        error,
        '알 수 없는 Ketcher 오류',
      )}`,
    );
  }
}

function hasAtomsInV2000MolBlock(molBlock: string): boolean {
  const countsLine = molBlock
    .split(/\r?\n/)
    .find((line) => /\bV2000\b/.test(line));

  if (!countsLine) {
    return molBlock.trim().length > 0;
  }

  const atomCount = Number.parseInt(countsLine.trim().split(/\s+/)[0] ?? '', 10);

  return Number.isFinite(atomCount) && atomCount > 0;
}

export function hasExtractedStructure(smiles: string, molBlock: string): boolean {
  if (smiles.trim().length > 0) {
    return true;
  }

  return hasAtomsInV2000MolBlock(molBlock);
}

export async function extractStructureFromKetcher(
  ketcher: KetcherStructureReader,
): Promise<ExtractedStructureData> {
  const smiles = await readKetcherText('SMILES', () => ketcher.getSmiles());
  const molBlock = await readKetcherText('MOL block', () => ketcher.getMolfile('v2000'));

  if (!hasExtractedStructure(smiles, molBlock)) {
    throw new Error('구조를 먼저 그려주세요.');
  }

  return {
    source: 'ketcher',
    validationStatus: 'unvalidated',
    smiles,
    molBlock,
    extractedAt: new Date().toISOString(),
  };
}
