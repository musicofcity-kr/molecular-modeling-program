import { describe, expect, it } from 'vitest';
import type { ActivityTemplate } from '../types/activity';
import type { MoleculeValidationResult } from '../types/molecule';
import type { VseprAnalysis } from '../types/vsepr';
import type { StructureComparisonObservation } from '../types/structureComparison';
import {
  ACTIVITY_RESULT_STORAGE_KEY,
  ACTIVITY_RESULT_STORAGE_LIMIT,
  ACTIVITY_RESULT_EXPORT_NOTICE,
  createActivityResultSnapshot,
  loadActivityResults,
  loadLatestActivityResult,
  saveActivityResult,
} from './activityResultStorage';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const activityTemplate: ActivityTemplate = {
  id: 'draw-methane',
  title: '메테인 분자 구조 그리기',
  targetMoleculeName: '메테인',
  learningGoal: '정사면체 구조를 설명한다.',
  prompt: '메테인을 그려 보세요.',
  predictionQuestions: [
    { id: 'predictedFormula', label: '예상 분자식' },
    { id: 'predictedMolecularWeight', label: '예상 분자량' },
    { id: 'drawingReason', label: '구조를 그렇게 그린 이유' },
  ],
  reflectionQuestions: [
    { id: 'afterValidationReflection', label: '확인 후 알게 된 점' },
  ],
};

const validationResult: MoleculeValidationResult = {
  ok: true,
  validationStatus: 'valid',
  source: 'smiles',
  smiles: 'C',
  canonicalSmiles: 'C',
  molecularFormula: 'CH4',
  molecularWeight: 16.043,
  structureIntent: 'single-molecule',
  graphSummary: {
    atomCount: 1,
    bondCount: 0,
    componentCount: 1,
    componentAtomCounts: [1],
    isSingleComponent: true,
    isolatedAtomCount: 1,
  },
  connectivityDecision: {
    allowed: true,
    status: 'single-component',
    intent: 'single-molecule',
  },
  warnings: ['전체 형식전하가 0인 전하 분리 구조는 교사와 함께 검토해 주세요.'],
  errors: [],
  developerLogs: [],
};

const vseprAnalysis: VseprAnalysis = {
  status: 'supported',
  scope: 'local-center',
  centralAtomId: '1',
  centralAtomSymbol: 'C',
  centralAtomLabel: 'C1',
  bondedAtomCount: 4,
  lonePairCount: 0,
  stericNumber: 4,
  axeNotation: 'AX4',
  electronDomainGeometryKo: '정사면체',
  molecularShapeKo: '정사면체',
  idealBondAngles: ['109.5°'],
  angleEvidence: {
    vseprIdealAngles: ['109.5°'],
  },
  confidence: 'high',
  warnings: [],
};

const comparisonObservation: StructureComparisonObservation = {
  moleculeName: '메테인',
  real3DSourceLabel: '예제 내장 3D 구조',
  observedSimilarities: '둘 다 정사면체처럼 보인다.',
  observedDifferences: 'VSEPR은 비공유 전자쌍이 없는 예측 모형이다.',
  studentReflection: '실제 좌표와 예측 모형의 출처가 다르다.',
};

function buildSnapshot(index = 0) {
  return createActivityResultSnapshot({
    id: `result-${index}`,
    now: `2026-06-30T13:${String(index).padStart(2, '0')}:00.000Z`,
    appMode: 'activity',
    userMode: 'student',
    activityTemplate,
    responses: {
      predictedFormula: 'CH4',
      predictedMolecularWeight: '16.043',
      drawingReason: '탄소가 수소 네 개와 결합한다.',
      afterValidationReflection: '예상과 RDKit 검증값이 같았다.',
      finalReflection: '다음에는 결합각도 확인해 보겠다.',
    },
    validationResult,
    molecule3DInput: {
      format: 'xyz',
      data: '5\nmethane\nC 0 0 0\nH 1 1 1\nH -1 -1 1\nH -1 1 -1\nH 1 -1 -1',
      label: '메테인',
      sourceType: 'static-example',
      coordinateDimension: '3d',
      coordinateSource: '예제 내장 3D 구조',
      sourceNote: '교육용 정적 좌표입니다.',
    },
    measurementResults: [
      {
        type: 'bond_angle',
        atomIndices: [2, 1, 3],
        atomLabels: ['H2', 'C1', 'H3'],
        value: 109.47,
        unit: 'degree',
        sourceNote: '현재 로드된 3D 좌표 기준입니다.',
      },
    ],
    vseprAnalysis,
    comparisonObservation,
  });
}

describe('activity result storage', () => {
  it('creates a classroom-safe activity result snapshot without raw structure payloads', () => {
    const snapshot = buildSnapshot();

    expect(snapshot.exportNotice).toBe(ACTIVITY_RESULT_EXPORT_NOTICE);
    expect(snapshot.studentPrediction.predictedFormula).toBe('CH4');
    expect(snapshot.rdkitValidation.molecularFormula).toBe('CH4');
    expect(snapshot.rdkitValidation.molecularWeight).toBe(16.043);
    expect(snapshot.rdkitValidation).toMatchObject({
      structureIntent: 'single-molecule',
      connectivityStatus: 'single-component',
      graphSummary: {
        atomCount: 1,
        bondCount: 0,
        componentCount: 1,
        componentAtomCounts: [1],
        isSingleComponent: true,
        isolatedAtomCount: 1,
      },
      warnings: [
        '전체 형식전하가 0인 전하 분리 구조는 교사와 함께 검토해 주세요.',
      ],
    });
    expect(snapshot.threeDObservation.has3DStructure).toBe(true);
    expect(snapshot.measurements[0].unit).toBe('degree');
    expect(snapshot.vseprResult?.axeNotation).toBe('AX4');
    expect(snapshot.vseprResult?.scope).toBe('local-center');
    expect(snapshot.vseprResult?.selectedCenter).toEqual({
      atomId: '1',
      atomSymbol: 'C',
      atomLabel: 'C1',
    });
    expect(snapshot.vseprResult?.angleEvidence).toEqual({
      vseprIdealAngles: ['109.5°'],
    });
    expect(snapshot.measurements[0]).toMatchObject({
      label: 'H2-C1-H3',
      value: 109.47,
      sourceNote: '현재 로드된 3D 좌표 기준입니다.',
    });
    expect(snapshot.comparisonObservation?.observedSimilarities).toContain('정사면체');
    expect(snapshot.afterValidationReflection).toBe('예상과 RDKit 검증값이 같았다.');
    expect(snapshot.finalReflection).toBe('다음에는 결합각도 확인해 보겠다.');
    expect(JSON.stringify(snapshot)).not.toContain('methane\\nC 0 0 0');
    expect(snapshot.rdkitValidation).not.toHaveProperty('smiles');
    expect(snapshot.rdkitValidation).not.toHaveProperty('molBlock');
  });

  it('preserves disconnected graph evidence for an invalid result without raw structure data', () => {
    const disconnectedSnapshot = createActivityResultSnapshot({
      appMode: 'activity',
      userMode: 'student',
      activityTemplate,
      responses: {},
      validationResult: {
        ok: false,
        validationStatus: 'invalid',
        source: 'smiles',
        structureIntent: 'single-molecule',
        graphSummary: {
          atomCount: 4,
          bondCount: 0,
          componentCount: 4,
          componentAtomCounts: [1, 1, 1, 1],
          isSingleComponent: false,
          isolatedAtomCount: 4,
        },
        connectivityDecision: {
          allowed: false,
          status: 'multiple-components-blocked',
          intent: 'single-molecule',
        },
        studentMessage:
          '현재 구조가 여러 조각으로 나뉘어 있습니다. 원자 사이를 결합으로 연결해 주세요.',
        warnings: [],
        errors: ['여러 조각'],
        developerLogs: ['raw internal graph detail'],
      },
      molecule3DInput: null,
      measurementResults: [],
      vseprAnalysis: {
        status: 'not_requested',
        confidence: 'low',
        warnings: [],
      },
    });

    expect(disconnectedSnapshot.rdkitValidation).toMatchObject({
      isValid: false,
      structureIntent: 'single-molecule',
      connectivityStatus: 'multiple-components-blocked',
      graphSummary: {
        atomCount: 4,
        bondCount: 0,
        componentCount: 4,
        componentAtomCounts: [1, 1, 1, 1],
        isSingleComponent: false,
        isolatedAtomCount: 4,
      },
    });
    expect(JSON.stringify(disconnectedSnapshot)).not.toContain(
      'raw internal graph detail',
    );
    expect(disconnectedSnapshot.rdkitValidation).not.toHaveProperty('smiles');
    expect(disconnectedSnapshot.rdkitValidation).not.toHaveProperty('molBlock');
  });

  it('preserves only explicitly supplied VSEPR generated-angle evidence', () => {
    const explicitEvidenceSnapshot = createActivityResultSnapshot({
      appMode: 'activity',
      userMode: 'student',
      activityTemplate,
      responses: {},
      validationResult,
      molecule3DInput: null,
      measurementResults: [
        {
          type: 'bond_angle',
          atomIndices: [3, 2, 1],
          atomLabels: ['O3', 'C2', 'C1'],
          value: 112.4,
          unit: 'degree',
          sourceNote: '선택 중심과 매핑되지 않은 일반 3D 좌표 측정값입니다.',
        },
      ],
      vseprAnalysis: {
        ...vseprAnalysis,
        angleEvidence: {
          vseprIdealAngles: ['109.5°'],
          generatedCoordinateMeasurements: [108.8],
        },
      },
    });

    expect(
      explicitEvidenceSnapshot.vseprResult?.angleEvidence
        ?.generatedCoordinateMeasurements,
    ).toEqual([108.8]);
    expect(
      explicitEvidenceSnapshot.vseprResult?.angleEvidence
        ?.generatedCoordinateMeasurements,
    ).not.toContain(112.4);
    expect(explicitEvidenceSnapshot.measurements[0].value).toBe(112.4);
  });

  it('stores only the latest classroom activity snapshots', () => {
    const storage = new MemoryStorage();

    for (let index = 0; index < ACTIVITY_RESULT_STORAGE_LIMIT + 2; index += 1) {
      const result = saveActivityResult(buildSnapshot(index), { storage });

      expect(result.ok).toBe(true);
    }

    const loaded = loadActivityResults({ storage });

    expect(loaded.ok).toBe(true);
    expect(loaded.data).toHaveLength(ACTIVITY_RESULT_STORAGE_LIMIT);
    expect(loaded.data[0].id).toBe(`result-${ACTIVITY_RESULT_STORAGE_LIMIT + 1}`);
    expect(loaded.data.at(-1)?.id).toBe('result-2');
  });

  it('loads the latest snapshot and handles malformed stored data safely', () => {
    const storage = new MemoryStorage();
    const snapshot = buildSnapshot();

    saveActivityResult(snapshot, { storage });

    expect(loadLatestActivityResult({ storage }).data?.id).toBe(snapshot.id);

    storage.setItem(ACTIVITY_RESULT_STORAGE_KEY, '{bad json');
    const malformed = loadActivityResults({ storage });

    expect(malformed.ok).toBe(false);
    expect(malformed.data).toEqual([]);
    expect(malformed.studentMessage).toContain('저장된 활동 결과를 읽지 못했습니다');
  });
});
