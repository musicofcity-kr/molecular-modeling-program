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

  it('registers PubChem CIDs only for the initial CID-based 3D prototype examples', () => {
    expect(
      exampleMolecules
        .filter((example) => example.pubchemCid)
        .map((example) => ({
          id: example.id,
          pubchemCid: example.pubchemCid,
          pubchemName: example.pubchemName,
          external3DSource: example.external3DSource,
        })),
    ).toEqual([
      {
        id: 'water',
        pubchemCid: 962,
        pubchemName: 'Water',
        external3DSource: 'pubchem',
      },
      {
        id: 'methane',
        pubchemCid: 297,
        pubchemName: 'Methane',
        external3DSource: 'pubchem',
      },
      {
        id: 'ethanol',
        pubchemCid: 702,
        pubchemName: 'Ethanol',
        external3DSource: 'pubchem',
      },
      {
        id: 'benzene',
        pubchemCid: 241,
        pubchemName: 'Benzene',
        external3DSource: 'pubchem',
      },
    ]);

    expect(
      exampleMolecules
        .filter((example) => !example.pubchemCid)
        .every((example) => example.external3DSource === 'none'),
    ).toBe(true);
  });

  it('includes static 3D coordinate examples only for the first classroom shell set', () => {
    const examplesWith3D = exampleMolecules
      .filter((example) => example.structure3D)
      .map((example) => ({
        id: example.id,
        format: example.structure3D?.format,
        sourceType: example.structure3D?.sourceType,
        sourceNote: example.structure3D?.sourceNote,
      }));

    expect(examplesWith3D).toEqual([
      {
        id: 'water',
        format: 'sdf',
        sourceType: 'static-example',
        sourceNote:
          '앱 내장 교육용 정적 3D 좌표입니다. 실험값, 에너지 최소화 결과, 결합각 계산용 데이터가 아닙니다.',
      },
      {
        id: 'methane',
        format: 'sdf',
        sourceType: 'static-example',
        sourceNote:
          '앱 내장 교육용 정적 3D 좌표입니다. 실험값, 에너지 최소화 결과, 결합각 계산용 데이터가 아닙니다.',
      },
    ]);

    const ethanol = exampleMolecules.find((example) => example.id === 'ethanol');
    expect(ethanol?.structure3D).toBeUndefined();
  });

  it('stores coordinate-bearing examples as static data, not generated SMILES output', () => {
    for (const example of exampleMolecules.filter((item) => item.structure3D)) {
      expect(example.structure3D?.data.split('\n')[0]).toContain('static 3D example');
      expect(example.structure3D?.data).toContain('V2000');
      expect(example.structure3D?.data).toContain('M  END');
      expect(example.structure3D?.data).toContain('$$$$');
      expect(example.structure3D?.sourceNote).not.toContain('SMILES');
    }
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
