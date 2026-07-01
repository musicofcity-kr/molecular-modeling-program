import type { ActivityResultSnapshot } from '../types/activityResult';
import type {
  ActivitySubmission,
  ActivitySubmissionStatus,
  TeacherFeedbackDraft,
} from '../types/feedback';
import type { StudentSession } from '../types/session';

export const ACTIVITY_SUBMISSION_STORAGE_KEY =
  'molecule-workbench-activity-submissions';
export const ACTIVITY_SUBMISSION_STORAGE_LIMIT = 40;

type StorageOptions = {
  storage?: Storage | null;
  key?: string;
};

type SaveOptions = StorageOptions & {
  limit?: number;
};

export type ActivitySubmissionStorageOutcome<T> = {
  ok: boolean;
  data: T;
  studentMessage: string;
  developerLogs: string[];
};

export type CreateActivitySubmissionInput = {
  snapshot: ActivityResultSnapshot;
  studentSession?: StudentSession;
  id?: string;
  now?: string;
};

export function createActivitySubmission({
  snapshot,
  studentSession,
  id,
  now = new Date().toISOString(),
}: CreateActivitySubmissionInput): ActivitySubmission {
  return {
    id: id ?? createSubmissionId(now),
    submittedAt: now,
    updatedAt: now,
    classCode: studentSession?.classCode,
    studentDisplayName: studentSession?.displayName,
    anonymousStudentId: studentSession?.anonymousStudentId,
    snapshot: {
      ...snapshot,
      updatedAt: now,
    },
    status: 'submitted',
  };
}

export function saveActivitySubmission(
  submission: ActivitySubmission,
  options: SaveOptions = {},
): ActivitySubmissionStorageOutcome<ActivitySubmission[]> {
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_SUBMISSION_STORAGE_KEY;
  const limit = options.limit ?? ACTIVITY_SUBMISSION_STORAGE_LIMIT;

  if (!storage) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '이 브라우저에서 제출함을 사용할 수 없어 활동 결과를 제출하지 못했습니다.',
      developerLogs: ['localStorage is not available for activity submissions.'],
    };
  }

  const current = readSubmissions(storage, key);
  const nextSubmissions = [
    submission,
    ...current.data.filter((item) => item.id !== submission.id),
  ].slice(0, limit);

  try {
    storage.setItem(key, JSON.stringify(nextSubmissions));

    return {
      ok: true,
      data: nextSubmissions,
      studentMessage:
        '활동 결과를 교사용 제출함에 보냈습니다. 현재 MVP에서는 같은 브라우저의 교사용 화면에서 확인합니다.',
      developerLogs: [
        ...current.developerLogs,
        `Saved activity submission: ${submission.id}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      data: current.data,
      studentMessage:
        '브라우저 저장 공간 문제로 활동 결과를 제출하지 못했습니다.',
      developerLogs: [
        ...current.developerLogs,
        `activity submission setItem failed: ${getErrorMessage(error)}`,
      ],
    };
  }
}

export function loadActivitySubmissions(
  options: StorageOptions = {},
): ActivitySubmissionStorageOutcome<ActivitySubmission[]> {
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_SUBMISSION_STORAGE_KEY;

  if (!storage) {
    return {
      ok: false,
      data: [],
      studentMessage: '이 브라우저에서 제출함을 읽을 수 없습니다.',
      developerLogs: ['localStorage is not available for activity submissions.'],
    };
  }

  return readSubmissions(storage, key);
}

export function updateActivitySubmissionFeedback(
  submissions: ActivitySubmission[],
  submissionId: string,
  feedback: TeacherFeedbackDraft,
  status: Extract<ActivitySubmissionStatus, 'feedback_draft' | 'feedback_returned'>,
  options: SaveOptions = {},
): ActivitySubmissionStorageOutcome<ActivitySubmission[]> {
  const now = new Date().toISOString();
  const nextSubmissions = submissions.map((submission) =>
    submission.id === submissionId
      ? {
          ...submission,
          updatedAt: now,
          status,
          teacherFeedback: {
            ...feedback,
            updatedAt: now,
          },
          feedbackReturnedAt:
            status === 'feedback_returned'
              ? now
              : submission.feedbackReturnedAt,
        }
      : submission,
  );
  const changedSubmission = nextSubmissions.find((item) => item.id === submissionId);

  if (!changedSubmission) {
    return {
      ok: false,
      data: submissions,
      studentMessage: '선택한 제출 자료를 찾지 못했습니다.',
      developerLogs: [`Submission not found: ${submissionId}`],
    };
  }

  return writeSubmissions(nextSubmissions, {
    ...options,
    successMessage:
      status === 'feedback_returned'
        ? '교사 피드백을 학생에게 전달했습니다.'
        : '교사용 피드백 초안을 저장했습니다.',
  });
}

function writeSubmissions(
  submissions: ActivitySubmission[],
  options: SaveOptions & { successMessage: string },
): ActivitySubmissionStorageOutcome<ActivitySubmission[]> {
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_SUBMISSION_STORAGE_KEY;
  const limit = options.limit ?? ACTIVITY_SUBMISSION_STORAGE_LIMIT;
  const nextSubmissions = submissions.slice(0, limit);

  if (!storage) {
    return {
      ok: false,
      data: submissions,
      studentMessage: '이 브라우저에서 제출함을 저장할 수 없습니다.',
      developerLogs: ['localStorage is not available for activity submissions.'],
    };
  }

  try {
    storage.setItem(key, JSON.stringify(nextSubmissions));

    return {
      ok: true,
      data: nextSubmissions,
      studentMessage: options.successMessage,
      developerLogs: [`Wrote activity submissions: ${nextSubmissions.length}`],
    };
  } catch (error) {
    return {
      ok: false,
      data: submissions,
      studentMessage: '제출함을 저장하지 못했습니다.',
      developerLogs: [`activity submissions write failed: ${getErrorMessage(error)}`],
    };
  }
}

function readSubmissions(
  storage: Storage,
  key: string,
): ActivitySubmissionStorageOutcome<ActivitySubmission[]> {
  const rawValue = storage.getItem(key);

  if (!rawValue) {
    return {
      ok: true,
      data: [],
      studentMessage: '제출된 활동 결과가 없습니다.',
      developerLogs: [`No activity submissions for key: ${key}`],
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error('Stored activity submissions are not an array.');
    }

    return {
      ok: true,
      data: parsed.filter(isActivitySubmission),
      studentMessage: '제출된 활동 결과를 불러왔습니다.',
      developerLogs: [`Loaded activity submissions: ${parsed.length}`],
    };
  } catch (error) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '저장된 제출 자료를 읽지 못했습니다. 새로 제출하면 손상된 제출함은 대체됩니다.',
      developerLogs: [`Stored activity submissions parse failed: ${getErrorMessage(error)}`],
    };
  }
}

function isActivitySubmission(value: unknown): value is ActivitySubmission {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ActivitySubmission>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.submittedAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    Boolean(candidate.snapshot) &&
    (
      candidate.status === 'submitted' ||
      candidate.status === 'feedback_draft' ||
      candidate.status === 'feedback_returned'
    )
  );
}

function createSubmissionId(now: string): string {
  return `activity-submission-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random()
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
