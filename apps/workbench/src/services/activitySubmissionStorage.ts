import type { ActivityResultSnapshot } from '../types/activityResult';
import type { ActivitySubmission } from '../types/feedback';
import type { StudentSession } from '../types/session';

export const ACTIVITY_SUBMISSION_STORAGE_KEY =
  'molecule-workbench-activity-submissions';
export const ACTIVITY_SUBMISSION_STORAGE_LIMIT = 40;

type StorageOptions = {
  storage?: Storage | null;
  key?: string;
};

type SessionCacheOptions = {
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

export function cacheActivitySubmissionForSession(
  currentSubmissions: ActivitySubmission[],
  submission: ActivitySubmission,
  options: SessionCacheOptions = {},
): ActivitySubmissionStorageOutcome<ActivitySubmission[]> {
  const limit = options.limit ?? ACTIVITY_SUBMISSION_STORAGE_LIMIT;
  const nextSubmissions = [
    submission,
    ...currentSubmissions.filter((item) => item.id !== submission.id),
  ].slice(0, limit);

  return {
    ok: true,
    data: nextSubmissions,
    studentMessage:
      '현재 활동 결과를 현재 화면의 임시 제출함에 보관했습니다. 새로고침하면 사라집니다.',
    developerLogs: [
      `Cached activity submission in session memory: ${submission.id}`,
    ],
  };
}

export function clearLegacyActivitySubmissionStorage(
  options: StorageOptions = {},
): ActivitySubmissionStorageOutcome<ActivitySubmission[]> {
  const storage = getStorage(options.storage);
  const key = options.key ?? ACTIVITY_SUBMISSION_STORAGE_KEY;

  if (!storage) {
    return {
      ok: true,
      data: [],
      studentMessage: '정리할 이전 브라우저 제출 캐시가 없습니다.',
      developerLogs: [
        'Legacy activity submission cache cleanup skipped: localStorage is unavailable.',
      ],
    };
  }

  try {
    storage.removeItem(key);

    return {
      ok: true,
      data: [],
      studentMessage: '이전 브라우저 제출 캐시를 안전하게 정리했습니다.',
      developerLogs: [`Removed legacy activity submission cache: ${key}`],
    };
  } catch (error) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '이전 브라우저 제출 캐시를 정리하지 못했습니다. 브라우저 사이트 데이터에서 직접 삭제해 주세요.',
      developerLogs: [
        `Legacy activity submission cache cleanup failed: ${getErrorMessage(error)}`,
      ],
    };
  }
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
