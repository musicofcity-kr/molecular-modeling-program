import type {
  ActivityResponseState,
  ActivityTemplate,
  AppMode,
  UserMode,
} from '../types/activity';
import type {
  ActivityResultAnswer,
  ActivityResultSnapshot,
} from '../types/activityResult';
import type {
  GeometryMeasurementResult,
  Molecule3DInput,
  MoleculeValidationResult,
} from '../types/molecule';
import type { StructureComparisonObservation } from '../types/structureComparison';
import type { VseprAnalysis } from '../types/vsepr';

export const ACTIVITY_RESULT_STORAGE_KEY = 'molecule-workbench-activity-results';
export const ACTIVITY_RESULT_STORAGE_LIMIT = 10;
export const ACTIVITY_RESULT_EXPORT_NOTICE =
  '이 결과는 수업 활동 기록용입니다. 구조 확인값은 분자식과 평균 분자량의 기준이며, 3D 측정값은 현재 로드된 참고 자료 기준입니다. 입체 구조 예상은 교육용 예측 모형입니다.';

type StorageOptions = {
  storage?: Storage | null;
  key?: string;
};

type SaveOptions = StorageOptions & {
  limit?: number;
};

export type ActivityResultStorageOutcome<T> = {
  ok: boolean;
  data: T;
  studentMessage: string;
  developerLogs: string[];
};

export type CreateActivityResultSnapshotInput = {
  id?: string;
  now?: string;
  appVersion?: string;
  appMode: AppMode;
  userMode: UserMode;
  activityTemplate?: ActivityTemplate | null;
  responses: ActivityResponseState;
  validationResult: MoleculeValidationResult | null;
  molecule3DInput: Molecule3DInput | null;
  measurementResults: GeometryMeasurementResult[];
  vseprAnalysis: VseprAnalysis;
  comparisonObservation?: StructureComparisonObservation;
};

export function createActivityResultSnapshot(
  input: CreateActivityResultSnapshotInput,
): ActivityResultSnapshot {
  const now = input.now ?? new Date().toISOString();
  const activityAnswers = buildActivityAnswers(
    input.activityTemplate,
    input.responses,
  );
  const rdkitValidation: ActivityResultSnapshot['rdkitValidation'] =
    input.validationResult?.ok === true
      ? {
          isValid: true,
          canonicalSmiles: input.validationResult.canonicalSmiles,
          molecularFormula: input.validationResult.molecularFormula,
          molecularWeight: input.validationResult.molecularWeight,
        }
      : {
          isValid: false,
          studentMessage:
            input.validationResult?.studentMessage ??
            '아직 구조 확인을 통과한 구조가 없습니다.',
        };

  return {
    id: input.id ?? createActivityResultId(now),
    createdAt: now,
    updatedAt: now,
    appMode: input.appMode,
    userMode: input.userMode,
    appVersion: input.appVersion,
    activityId: input.activityTemplate?.id,
    activityTitle: input.activityTemplate?.title,
    moleculeName:
      input.activityTemplate?.targetMoleculeName ??
      input.comparisonObservation?.moleculeName ??
      input.molecule3DInput?.label,
    studentPrediction: {
      predictedFormula: cleanOptional(input.responses.predictedFormula),
      predictedMolecularWeight: cleanOptional(
        input.responses.predictedMolecularWeight,
      ),
      drawingReason: cleanOptional(input.responses.drawingReason),
    },
    rdkitValidation,
    threeDObservation: {
      has3DStructure: input.molecule3DInput?.coordinateDimension === '3d',
      sourceLabel: input.molecule3DInput?.coordinateSource,
      sourceNote: input.molecule3DInput?.sourceNote,
      studentObservation: cleanOptional(
        input.responses.threeDObservation ??
          input.responses.vseprModelVsPubChemObservation,
      ),
    },
    measurements: input.measurementResults.map((result) => ({
      type: result.type,
      label: result.atomLabels.join('-'),
      value: result.value,
      unit: result.unit,
      sourceNote: result.sourceNote,
    })),
    vseprResult:
      input.vseprAnalysis.status === 'not_requested'
        ? undefined
        : {
            available: input.vseprAnalysis.status === 'supported',
            axeNotation: input.vseprAnalysis.axeNotation,
            electronGeometryKo: input.vseprAnalysis.electronDomainGeometryKo,
            molecularGeometryKo: input.vseprAnalysis.molecularShapeKo,
            idealBondAngle: input.vseprAnalysis.idealBondAngles?.join(', '),
            confidence: input.vseprAnalysis.confidence,
            studentNote: cleanOptional(input.responses.vseprReflection),
          },
    comparisonObservation: input.comparisonObservation
      ? {
          available: Boolean(
            input.comparisonObservation.observedSimilarities ||
              input.comparisonObservation.observedDifferences ||
              input.comparisonObservation.studentReflection,
          ),
          observedSimilarities: cleanOptional(
            input.comparisonObservation.observedSimilarities,
          ),
          observedDifferences: cleanOptional(
            input.comparisonObservation.observedDifferences,
          ),
          studentReflection: cleanOptional(
            input.comparisonObservation.studentReflection,
          ),
        }
      : undefined,
    activityAnswers,
    afterValidationReflection: cleanOptional(input.responses.afterValidationReflection),
    finalReflection: cleanOptional(input.responses.finalReflection),
    exportNotice: ACTIVITY_RESULT_EXPORT_NOTICE,
  };
}

export function saveActivityResult(
  snapshot: ActivityResultSnapshot,
  options: SaveOptions = {},
): ActivityResultStorageOutcome<ActivityResultSnapshot> {
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_RESULT_STORAGE_KEY;
  const limit = options.limit ?? ACTIVITY_RESULT_STORAGE_LIMIT;

  if (!storage) {
    return {
      ok: false,
      data: snapshot,
      studentMessage:
        '이 브라우저에서 임시 저장을 사용할 수 없어 활동 결과를 저장하지 못했습니다.',
      developerLogs: ['localStorage is not available.'],
    };
  }

  const current = readSnapshots(storage, key);
  const nextSnapshots = [
    snapshot,
    ...current.data.filter((item) => item.id !== snapshot.id),
  ].slice(0, limit);

  try {
    storage.setItem(key, JSON.stringify(nextSnapshots));

    return {
      ok: true,
      data: snapshot,
      studentMessage:
        '현재 활동 결과를 이 브라우저에 임시 저장했습니다. 이 저장은 현재 브라우저에만 보관됩니다.',
      developerLogs: [
        ...current.developerLogs,
        `Saved activity result snapshot: ${snapshot.id}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      data: snapshot,
      studentMessage:
        '브라우저 저장 공간 문제로 활동 결과를 저장하지 못했습니다. 대신 보고서로 저장하기를 사용하거나 교사용 내보내기를 사용하세요.',
      developerLogs: [
        ...current.developerLogs,
        `localStorage setItem failed: ${getErrorMessage(error)}`,
      ],
    };
  }
}

export function loadLatestActivityResult(
  options: StorageOptions = {},
): ActivityResultStorageOutcome<ActivityResultSnapshot | null> {
  const loaded = loadActivityResults(options);

  return {
    ...loaded,
    data: loaded.data[0] ?? null,
  };
}

export function loadActivityResults(
  options: StorageOptions = {},
): ActivityResultStorageOutcome<ActivityResultSnapshot[]> {
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_RESULT_STORAGE_KEY;

  if (!storage) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '이 브라우저에서 저장된 활동 결과를 읽을 수 없습니다.',
      developerLogs: ['localStorage is not available.'],
    };
  }

  return readSnapshots(storage, key);
}

export function deleteActivityResult(
  id: string,
  options: StorageOptions = {},
): ActivityResultStorageOutcome<ActivityResultSnapshot[]> {
  const loaded = loadActivityResults(options);
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_RESULT_STORAGE_KEY;
  const nextSnapshots = loaded.data.filter((snapshot) => snapshot.id !== id);

  if (!storage) {
    return loaded;
  }

  try {
    storage.setItem(key, JSON.stringify(nextSnapshots));

    return {
      ok: true,
      data: nextSnapshots,
      studentMessage: '선택한 저장 결과를 삭제했습니다.',
      developerLogs: [`Deleted activity result snapshot: ${id}`],
    };
  } catch (error) {
    return {
      ok: false,
      data: loaded.data,
      studentMessage: '저장 결과를 삭제하지 못했습니다.',
      developerLogs: [`localStorage delete update failed: ${getErrorMessage(error)}`],
    };
  }
}

export function clearActivityResults(
  options: StorageOptions = {},
): ActivityResultStorageOutcome<ActivityResultSnapshot[]> {
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_RESULT_STORAGE_KEY;

  if (!storage) {
    return {
      ok: false,
      data: [],
      studentMessage: '저장 결과를 삭제할 수 없습니다.',
      developerLogs: ['localStorage is not available.'],
    };
  }

  try {
    storage.removeItem(key);

    return {
      ok: true,
      data: [],
      studentMessage: '이 브라우저에 임시 저장된 활동 결과를 모두 삭제했습니다.',
      developerLogs: ['Cleared activity result snapshots.'],
    };
  } catch (error) {
    return {
      ok: false,
      data: [],
      studentMessage: '저장 결과를 삭제하지 못했습니다.',
      developerLogs: [`localStorage clear failed: ${getErrorMessage(error)}`],
    };
  }
}

function readSnapshots(
  storage: Storage,
  key: string,
): ActivityResultStorageOutcome<ActivityResultSnapshot[]> {
  const rawValue = storage.getItem(key);

  if (!rawValue) {
    return {
      ok: true,
      data: [],
      studentMessage: '저장된 활동 결과가 없습니다.',
      developerLogs: [`No activity result snapshots for key: ${key}`],
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error('Stored activity results are not an array.');
    }

    return {
      ok: true,
      data: parsed.filter(isActivityResultSnapshot),
      studentMessage: '저장된 활동 결과를 불러왔습니다.',
      developerLogs: [`Loaded activity result snapshots: ${parsed.length}`],
    };
  } catch (error) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '저장된 활동 결과를 읽지 못했습니다. 새로 저장하면 기존 손상된 데이터는 대체됩니다.',
      developerLogs: [`Stored activity result parse failed: ${getErrorMessage(error)}`],
    };
  }
}

function buildActivityAnswers(
  template: ActivityTemplate | null | undefined,
  responses: ActivityResponseState,
): ActivityResultAnswer[] {
  if (!template) {
    return [];
  }

  return [...template.predictionQuestions, ...template.reflectionQuestions].map(
    (question) => ({
      questionId: question.id,
      questionText: question.label,
      answer: responses[question.id]?.trim() ?? '',
    }),
  );
}

function createActivityResultId(now: string): string {
  return `activity-result-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getStorage(storage?: Storage | null): Storage | null {
  if (storage !== undefined) {
    return storage;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function cleanOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}

function isActivityResultSnapshot(value: unknown): value is ActivityResultSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ActivityResultSnapshot>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.exportNotice === 'string'
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
