import { describe, expect, it } from 'vitest';
import type { ActivityTemplate } from '../types/activity';
import type {
  Molecule3DInput,
  MoleculeValidationResult,
} from '../types/molecule';
import type { VseprAnalysis } from '../types/vsepr';
import {
  buildStructureComparisonState,
  CAUTION_COMPARISON_MOLECULE_IDS,
  CONDITIONAL_COMPARISON_MOLECULE_LABELS,
  isComparisonAvailable,
  RECOMMENDED_COMPARISON_MOLECULE_IDS,
} from './structureComparison';

const validWaterResult: MoleculeValidationResult = {
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
};

const invalidResult: MoleculeValidationResult = {
  ok: false,
  validationStatus: 'invalid',
  studentMessage: '구조를 검증하지 못했습니다.',
  warnings: [],
  errors: ['invalid'],
  developerLogs: ['invalid'],
};

const water3D: Molecule3DInput = {
  format: 'sdf',
  data: 'water 3d\n  Workbench\n\n  3  2  0  0  0  0  0  0  0  0999 V2000\n    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0\n    0.9572    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\n   -0.2390    0.9270    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0\nM  END',
  label: '물',
  sourceType: 'static-example',
  coordinateDimension: '3d',
  coordinateSource: '예제 내장 3D 구조',
  sourceNote: '교육용 정적 좌표입니다.',
};

const waterVsepr: VseprAnalysis = {
  status: 'supported',
  centralAtomId: '1',
  centralAtomSymbol: 'O',
  bondedAtomCount: 2,
  lonePairCount: 2,
  stericNumber: 4,
  axeNotation: 'AX2E2',
  electronDomainGeometryKo: '정사면체',
  molecularShapeKo: '굽은형',
  idealBondAngles: ['< 109.5°'],
  confidence: 'high',
  warnings: [],
};

const waterActivity: ActivityTemplate = {
  id: 'draw-water',
  title: '물 분자 구조 그리기',
  targetMoleculeName: '물',
  learningGoal: '물 분자를 비교한다.',
  prompt: '물 분자를 그려 보세요.',
  predictionQuestions: [],
  reflectionQuestions: [],
  comparisonMode: {
    enabled: true,
    recommended: true,
    focusQuestion: '물의 굽은형 구조를 비교해 보세요.',
  },
};

const carbonDioxideActivity: ActivityTemplate = {
  id: 'draw-carbon-dioxide',
  title: '이산화탄소 분자 구조 그리기',
  targetMoleculeName: '이산화탄소',
  learningGoal: '이산화탄소 선형 구조 비교',
  prompt: '이산화탄소를 그려 보세요.',
  predictionQuestions: [],
  reflectionQuestions: [],
  comparisonMode: {
    enabled: true,
    recommended: true,
    focusQuestion: 'CO2 선형 구조를 비교해 보세요.',
  },
};

describe('structureComparison', () => {
  it('defines recommended, conditional, and caution comparison molecule sets', () => {
    expect(RECOMMENDED_COMPARISON_MOLECULE_IDS).toContain('water');
    expect(RECOMMENDED_COMPARISON_MOLECULE_IDS).toContain('methane');
    expect(RECOMMENDED_COMPARISON_MOLECULE_IDS).toContain('ammonia');
    expect(RECOMMENDED_COMPARISON_MOLECULE_IDS).toContain('carbon-dioxide');
    expect(CONDITIONAL_COMPARISON_MOLECULE_LABELS).toContain('BF3');
    expect(CAUTION_COMPARISON_MOLECULE_IDS).toContain('ethanol');
    expect(CAUTION_COMPARISON_MOLECULE_IDS).toContain('benzene');
  });

  it('marks comparison available only when RDKit, real 3D, and VSEPR model are ready', () => {
    const state = buildStructureComparisonState({
      validationResult: validWaterResult,
      molecule3DInput: water3D,
      vseprAnalysis: waterVsepr,
      selectedActivity: waterActivity,
    });

    expect(state.availability).toBe('available');
    expect(isComparisonAvailable(state)).toBe(true);
    expect(state.rdkitFormula).toBe('H2O');
    expect(state.rdkitCanonicalSmiles).toBe('O');
    expect(state.real3DSourceLabel).toBe('예제 내장 3D 구조');
    expect(state.vseprSourceLabel).toContain('AX2E2');
    expect(state.recommended).toBe(true);
  });

  it('blocks comparison when RDKit validation failed', () => {
    const state = buildStructureComparisonState({
      validationResult: invalidResult,
      molecule3DInput: water3D,
      vseprAnalysis: waterVsepr,
    });

    expect(state.availability).toBe('rdkit_invalid');
    expect(isComparisonAvailable(state)).toBe(false);
    expect(state.studentMessage).toContain('RDKit.js 검증');
  });

  it('blocks comparison when real 3D coordinates are missing', () => {
    const state = buildStructureComparisonState({
      validationResult: validWaterResult,
      molecule3DInput: null,
      vseprAnalysis: waterVsepr,
    });

    expect(state.availability).toBe('missing_real_3d');
    expect(state.real3DStructureAvailable).toBe(false);
  });

  it('blocks comparison when VSEPR analysis is missing', () => {
    const state = buildStructureComparisonState({
      validationResult: validWaterResult,
      molecule3DInput: water3D,
      vseprAnalysis: {
        status: 'not_requested',
        confidence: 'low',
        warnings: [],
        studentMessage: 'VSEPR 예측 전입니다.',
      },
    });

    expect(state.availability).toBe('missing_vsepr');
    expect(state.vseprModelAvailable).toBe(false);
  });

  it('blocks comparison for low confidence VSEPR results', () => {
    const state = buildStructureComparisonState({
      validationResult: validWaterResult,
      molecule3DInput: water3D,
      vseprAnalysis: {
        ...waterVsepr,
        confidence: 'low',
      },
    });

    expect(state.availability).toBe('low_confidence_vsepr');
    expect(state.warnings.join('\n')).toContain('신뢰도가 낮아');
  });

  it('blocks one-whole-molecule comparison for multi-center or caution molecules', () => {
    const state = buildStructureComparisonState({
      validationResult: {
        ...validWaterResult,
        canonicalSmiles: 'CCO',
        molecularFormula: 'C2H6O',
      },
      molecule3DInput: {
        ...water3D,
        label: '에탄올',
        coordinateSource: 'PubChem CID 702',
      },
      selectedExample: {
        id: 'ethanol',
        nameKo: '에탄올',
        nameEn: 'Ethanol',
        smiles: 'CCO',
        expectedFormula: 'C2H6O',
        teachingUse: '중심 원자별 국소 VSEPR 분석',
        category: '유기 기초',
      },
      vseprAnalysis: {
        ...waterVsepr,
        centralAtomCandidates: [
          {
            atomId: '1',
            atomSymbol: 'C',
            atomLabel: 'C1',
            bondedAtomCount: 4,
            explicitBondedAtomCount: 1,
            inferredHydrogenCount: 3,
          },
          {
            atomId: '2',
            atomSymbol: 'C',
            atomLabel: 'C2',
            bondedAtomCount: 4,
            explicitBondedAtomCount: 2,
            inferredHydrogenCount: 2,
          },
        ],
      },
    });

    expect(state.availability).toBe('multi_center_not_recommended');
    expect(state.studentMessage).toContain('하나의 VSEPR 모형');
    expect(state.teacherNote).toContain('단일 중심 원자');
  });

  it('allows recommended clear-center CO2 comparison even when candidate list has terminal atoms', () => {
    const state = buildStructureComparisonState({
      validationResult: {
        ...validWaterResult,
        canonicalSmiles: 'O=C=O',
        molecularFormula: 'CO2',
      },
      molecule3DInput: {
        ...water3D,
        label: '이산화탄소',
        sourceType: 'pubchem',
        structureMatchStatus: 'verified',
        coordinateSource: 'PubChem CID 280',
      },
      selectedExample: {
        id: 'carbon-dioxide',
        nameKo: '이산화탄소',
        nameEn: 'Carbon dioxide',
        smiles: 'O=C=O',
        expectedFormula: 'CO2',
        teachingUse: '선형 구조 비교',
        category: '기본 분자',
      },
      selectedActivity: carbonDioxideActivity,
      vseprAnalysis: {
        status: 'supported',
        centralAtomId: '2',
        centralAtomSymbol: 'C',
        centralAtomCandidates: [
          {
            atomId: '1',
            atomSymbol: 'O',
            atomLabel: 'O1',
            bondedAtomCount: 1,
            explicitBondedAtomCount: 1,
            inferredHydrogenCount: 0,
          },
          {
            atomId: '2',
            atomSymbol: 'C',
            atomLabel: 'C2',
            bondedAtomCount: 2,
            explicitBondedAtomCount: 2,
            inferredHydrogenCount: 0,
          },
        ],
        bondedAtomCount: 2,
        lonePairCount: 0,
        stericNumber: 2,
        axeNotation: 'AX2',
        electronDomainGeometryKo: '선형',
        molecularShapeKo: '선형',
        idealBondAngles: ['180°'],
        confidence: 'high',
        warnings: [],
      },
    });

    expect(state.availability).toBe('available');
    expect(state.recommended).toBe(true);
  });

  it('blocks comparison for PubChem 3D data that is only formula-compatible', () => {
    const state = buildStructureComparisonState({
      validationResult: {
        ...validWaterResult,
        canonicalSmiles: 'CCO',
        molecularFormula: 'C2H6O',
      },
      molecule3DInput: {
        ...water3D,
        label: 'PubChem 후보',
        sourceType: 'pubchem',
        structureMatchStatus: 'formula-compatible',
        coordinateSource: 'PubChem CID 999',
      },
      vseprAnalysis: {
        ...waterVsepr,
        axeNotation: 'AX4',
        molecularShapeKo: '정사면체',
      },
    });

    expect(state.availability).toBe('missing_real_3d');
    expect(state.real3DStructureAvailable).toBe(false);
  });
});
