import { describe, expect, it } from 'vitest';
import { validateMoleculeInput } from '../services/rdkitService';
import {
  buildExpectedFormulaWarning,
  exampleMolecules,
} from './exampleMolecules';

describe('exampleMolecules', () => {
  it('contains the required classroom example molecule set', () => {
    expect(
      exampleMolecules.map((example) => ({
        id: example.id,
        nameKo: example.nameKo,
        smiles: example.smiles,
        category: example.category,
      })),
    ).toEqual([
      { id: 'water', nameKo: '물', smiles: 'O', category: '기본 분자' },
      { id: 'methane', nameKo: '메테인', smiles: 'C', category: '기본 분자' },
      { id: 'ammonia', nameKo: '암모니아', smiles: 'N', category: '기본 분자' },
      {
        id: 'carbon-dioxide',
        nameKo: '이산화탄소',
        smiles: 'O=C=O',
        category: '기본 분자',
      },
      { id: 'ethanol', nameKo: '에탄올', smiles: 'CCO', category: '유기 기초' },
      {
        id: 'acetic-acid',
        nameKo: '아세트산',
        smiles: 'CC(=O)O',
        category: '유기 기초',
      },
      { id: 'benzene', nameKo: '벤젠', smiles: 'c1ccccc1', category: '유기 기초' },
      {
        id: 'glucose',
        nameKo: '포도당',
        smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O',
        category: '생활 속 분자',
      },
      {
        id: 'aspirin',
        nameKo: '아스피린',
        smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
        category: '생활 속 분자',
      },
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
      expect(result.molecularFormula).toBe(example.expectedFormula);
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

  it('builds a warning when expectedFormula and RDKit formula diverge', () => {
    expect(
      buildExpectedFormulaWarning(
        { nameKo: '테스트 분자', expectedFormula: 'NH3' },
        'H3N',
      ),
    ).toBe(
      '테스트 분자 예제의 expectedFormula(NH3)와 RDKit 검증 결과(H3N)가 다릅니다. 학생용 패널에는 RDKit 결과를 표시합니다.',
    );

    expect(
      buildExpectedFormulaWarning(
        { nameKo: '테스트 분자', expectedFormula: 'H3N' },
        'H3N',
      ),
    ).toBeNull();
  });
});
