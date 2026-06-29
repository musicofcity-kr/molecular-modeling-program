import { describe, expect, it } from 'vitest';
import { validateMoleculeInput } from '../services/rdkitService';
import { exampleMolecules } from './exampleMolecules';

describe('exampleMolecules', () => {
  it('contains the required classroom example molecule set', () => {
    expect(exampleMolecules.map((example) => example.nameKo)).toEqual([
      '물',
      '메테인',
      '암모니아',
      '이산화탄소',
      '에탄올',
      '아세트산',
      '벤젠',
      '포도당',
      '아스피린',
    ]);
  });

  it.each(exampleMolecules)(
    'matches RDKit validation output for $nameKo',
    async (example) => {
      const result = await validateMoleculeInput({
        source: 'example',
        validationStatus: 'unvalidated',
        label: example.nameKo,
        smiles: example.smiles,
      });

      expect(result.ok).toBe(true);
      expect(result.validationStatus).toBe('valid');
      expect(result.molecularFormula).toBe(example.formula);
      expect(result.molecularWeight).toBeGreaterThan(0);
      expect(result.canonicalSmiles).toBeTruthy();
    },
  );

  it('keeps example records as metadata without stored molecular weights', () => {
    expect(
      exampleMolecules.every(
        (example) => !('molecularWeight' in example) && !('exactMass' in example),
      ),
    ).toBe(true);
  });
});
