import { describe, expect, it } from 'vitest';
import { moleculeExamples } from '../chemistry/examples';
import {
  getRDKitInitializationCountForTests,
  resetRDKitForTests,
  validateMoleculeInput,
} from './rdkitService';

const ethanolMolBlock = [
  '',
  '     RDKit          2D',
  '',
  '  3  2  0  0  0  0  0  0  0  0999 V2000',
  '    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
  '    1.2990    0.7500    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0',
  '    2.5981   -0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0',
  '  1  2  1  0',
  '  2  3  1  0',
  'M  END',
].join('\n');

const documentedClassroomFixtures = [
  {
    name: 'water',
    smiles: 'O',
    expectedCanonicalSmiles: 'O',
    expectedFormula: 'H2O',
    expectedAverageMolecularWeight: 18.015,
    exactMassForComparison: 18.01056,
  },
  {
    name: 'methane',
    smiles: 'C',
    expectedCanonicalSmiles: 'C',
    expectedFormula: 'CH4',
    expectedAverageMolecularWeight: 16.043,
    exactMassForComparison: 16.0313,
  },
  {
    name: 'ethanol',
    smiles: 'CCO',
    expectedCanonicalSmiles: 'CCO',
    expectedFormula: 'C2H6O',
    expectedAverageMolecularWeight: 46.069,
    exactMassForComparison: 46.04186,
  },
  {
    name: 'benzene',
    smiles: 'c1ccccc1',
    expectedCanonicalSmiles: 'c1ccccc1',
    expectedFormula: 'C6H6',
    expectedAverageMolecularWeight: 78.11399,
    exactMassForComparison: 78.04695,
  },
  {
    name: 'acetic acid',
    smiles: 'CC(=O)O',
    expectedCanonicalSmiles: 'CC(=O)O',
    expectedFormula: 'C2H4O2',
    expectedAverageMolecularWeight: 60.052,
    exactMassForComparison: 60.02112,
  },
  {
    name: 'aspirin',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    expectedCanonicalSmiles: 'CC(=O)Oc1ccccc1C(=O)O',
    expectedFormula: 'C9H8O4',
    expectedAverageMolecularWeight: 180.15899,
    exactMassForComparison: 180.04225,
  },
];

describe('validateMoleculeInput', () => {
  it('fails empty input without chemistry output', async () => {
    const result = await validateMoleculeInput({
      source: 'example',
      validationStatus: 'unvalidated',
    });

    expect(result.ok).toBe(false);
    expect(result.validationStatus).toBe('invalid');
    expect(result.molecularFormula).toBeUndefined();
    expect(result.molecularWeight).toBeUndefined();
    expect(result.canonicalSmiles).toBeUndefined();
    expect(result.studentMessage).toContain(
      '현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다',
    );
    expect(result.developerLogs[0]).toContain('empty molecule input');
  });

  it('fails invalid SMILES without chemistry output', async () => {
    const result = await validateMoleculeInput({
      source: 'example',
      validationStatus: 'unvalidated',
      smiles: 'C1CC',
    });

    expect(result.ok).toBe(false);
    expect(result.validationStatus).toBe('invalid');
    expect(result.source).toBe('smiles');
    expect(result.molecularFormula).toBeUndefined();
    expect(result.molecularWeight).toBeUndefined();
    expect(result.canonicalSmiles).toBeUndefined();
    expect(result.developerLogs.length).toBeGreaterThan(0);
  });

  it.each(moleculeExamples)(
    'validates $labelKo fixture and computes formula',
    async (example) => {
      const result = await validateMoleculeInput({
        source: 'example',
        validationStatus: 'unvalidated',
        smiles: example.smiles,
        label: example.labelKo,
      });

      expect(result.ok).toBe(true);
      expect(result.validationStatus).toBe('valid');
      expect(result.source).toBe('smiles');
      expect(result.molecularFormula).toBe(example.expectedFormula);
      expect(result.molecularWeight).toBeGreaterThan(0);
      expect(result.canonicalSmiles).toBeTruthy();
      expect(result.errors).toEqual([]);
    },
  );

  it.each(documentedClassroomFixtures)(
    'matches documented RDKit outputs for $name',
    async (fixture) => {
      const result = await validateMoleculeInput({
        source: 'example',
        validationStatus: 'unvalidated',
        smiles: fixture.smiles,
      });

      expect(result.ok).toBe(true);
      expect(result.validationStatus).toBe('valid');
      expect(result.source).toBe('smiles');
      expect(result.canonicalSmiles).toBe(fixture.expectedCanonicalSmiles);
      expect(result.molecularFormula).toBe(fixture.expectedFormula);
      expect(result.molecularFormula).toMatch(/^([A-Z][a-z]?\d*)+$/);
      expect(result.molecularWeight).toBeCloseTo(
        fixture.expectedAverageMolecularWeight,
        3,
      );
      expect(result.molecularWeight).not.toBeCloseTo(
        fixture.exactMassForComparison,
        3,
      );
    },
  );

  it('validates a V2000 MOL block and prefers it over SMILES when present', async () => {
    const result = await validateMoleculeInput({
      source: 'ketcher',
      validationStatus: 'unvalidated',
      smiles: 'C',
      molBlock: ethanolMolBlock,
    });

    expect(result.ok).toBe(true);
    expect(result.source).toBe('mol-block');
    expect(result.canonicalSmiles).toBe('CCO');
    expect(result.molecularFormula).toBe('C2H6O');
    expect(result.molecularWeight).toBeCloseTo(46.069, 3);
    expect(result.molecularWeight).not.toBeCloseTo(46.04186, 3);
  });

  it('reuses a single RDKit initialization for repeated validation', async () => {
    resetRDKitForTests();

    await validateMoleculeInput({
      source: 'example',
      validationStatus: 'unvalidated',
      smiles: 'O',
    });
    await validateMoleculeInput({
      source: 'example',
      validationStatus: 'unvalidated',
      smiles: 'C',
    });

    expect(getRDKitInitializationCountForTests()).toBe(1);
  });
});
