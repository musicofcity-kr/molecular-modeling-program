import { describe, expect, it } from 'vitest';
import { moleculeExamples } from './examples';
import { validateMoleculeInput } from './validation-service';
import {
  getRDKitInitializationCountForTests,
  resetRDKitLoaderForTests,
} from './rdkit-loader';

describe('validateMoleculeInput', () => {
  it('fails empty input without chemistry output', async () => {
    const result = await validateMoleculeInput({ source: 'example' });

    expect(result.ok).toBe(false);
    expect(result.formula).toBeUndefined();
    expect(result.molecularWeight).toBeUndefined();
    expect(result.canonicalSmiles).toBeUndefined();
    expect(result.errors[0]).toContain('현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다');
    expect(result.developerLogs[0]).toContain('empty molecule input');
  });

  it('fails invalid SMILES without chemistry output', async () => {
    const result = await validateMoleculeInput({
      source: 'example',
      smiles: 'C1CC',
    });

    expect(result.ok).toBe(false);
    expect(result.formula).toBeUndefined();
    expect(result.molecularWeight).toBeUndefined();
    expect(result.canonicalSmiles).toBeUndefined();
    expect(result.developerLogs.length).toBeGreaterThan(0);
  });

  it.each(moleculeExamples)(
    'validates $labelKo fixture and computes formula',
    async (example) => {
      const result = await validateMoleculeInput({
        source: 'example',
        smiles: example.smiles,
        label: example.labelKo,
      });

      expect(result.ok).toBe(true);
      expect(result.source).toBe('smiles');
      expect(result.formula).toBe(example.expectedFormula);
      expect(result.molecularWeight).toBeGreaterThan(0);
      expect(result.canonicalSmiles).toBeTruthy();
      expect(result.errors).toEqual([]);
    },
  );

  it('reuses a single RDKit initialization for repeated validation', async () => {
    resetRDKitLoaderForTests();

    await validateMoleculeInput({ source: 'example', smiles: 'O' });
    await validateMoleculeInput({ source: 'example', smiles: 'C' });

    expect(getRDKitInitializationCountForTests()).toBe(1);
  });
});
