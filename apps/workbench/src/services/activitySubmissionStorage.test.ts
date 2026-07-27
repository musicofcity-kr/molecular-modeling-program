import { describe, expect, it } from 'vitest';
import type { ActivityResultSnapshot } from '../types/activityResult';
import type { StudentSession } from '../types/session';
import {
  ACTIVITY_SUBMISSION_STORAGE_KEY,
  cacheActivitySubmissionForSession,
  clearLegacyActivitySubmissionStorage,
  createActivitySubmission,
} from './activitySubmissionStorage';

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

const snapshot: ActivityResultSnapshot = {
  id: 'result-1',
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-07-01T10:00:00.000Z',
  appMode: 'activity',
  userMode: 'student',
  activityTitle: '물 분자 구조 그리기',
  moleculeName: '물',
  studentPrediction: {
    predictedFormula: 'H2O',
    drawingReason: '산소와 수소가 결합한다.',
  },
  rdkitValidation: {
    isValid: true,
    molecularFormula: 'H2O',
    molecularWeight: 18.015,
  },
  threeDObservation: {
    has3DStructure: true,
    sourceLabel: '예제 내장 3D 구조',
  },
  measurements: [],
  activityAnswers: [],
  exportNotice: '수업 활동 기록용입니다.',
};

const studentSession: StudentSession = {
  role: 'student',
  classCode: 'CHEM-101',
  displayName: '3조-학생A',
  anonymousStudentId: 'student-123',
  startedAt: '2026-07-01T09:00:00.000Z',
};

describe('activity submission storage', () => {
  it('creates a classroom submission for the trusted endpoint', () => {
    const submission = createActivitySubmission({
      snapshot,
      studentSession,
      id: 'submission-1',
      now: '2026-07-01T10:10:00.000Z',
    });

    expect(submission.status).toBe('submitted');
    expect(submission.classCode).toBe('CHEM-101');
    expect(submission.studentDisplayName).toBe('3조-학생A');
    expect(submission.anonymousStudentId).toBe('student-123');
  });

  it('keeps a submission only in the supplied session-memory list', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ACTIVITY_SUBMISSION_STORAGE_KEY,
      JSON.stringify([{ studentDisplayName: '이전 학생', snapshot }]),
    );
    const submission = createActivitySubmission({
      snapshot,
      studentSession,
      id: 'submission-1',
      now: '2026-07-01T10:10:00.000Z',
    });

    const cached = cacheActivitySubmissionForSession([], submission);

    expect(cached.ok).toBe(true);
    expect(cached.data).toEqual([submission]);
    expect(cached.studentMessage).toContain('현재 화면');
    expect(cached.studentMessage).toContain('새로고침하면 사라집니다');
    expect(storage.getItem(ACTIVITY_SUBMISSION_STORAGE_KEY)).not.toBeNull();
  });

  it('removes legacy origin-wide submissions without reading them into the app', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      ACTIVITY_SUBMISSION_STORAGE_KEY,
      JSON.stringify([
        {
          studentDisplayName: '이전 학생',
          anonymousStudentId: 'legacy-student',
          snapshot,
        },
      ]),
    );

    const cleared = clearLegacyActivitySubmissionStorage({ storage });

    expect(cleared.ok).toBe(true);
    expect(cleared.data).toEqual([]);
    expect(storage.getItem(ACTIVITY_SUBMISSION_STORAGE_KEY)).toBeNull();
  });

  it('deduplicates and bounds the session-memory cache without browser storage', () => {
    const first = createActivitySubmission({
      snapshot,
      studentSession,
      id: 'submission-1',
      now: '2026-07-01T10:10:00.000Z',
    });
    const second = createActivitySubmission({
      snapshot,
      studentSession,
      id: 'submission-2',
      now: '2026-07-01T10:11:00.000Z',
    });
    const replacement = {
      ...first,
      updatedAt: '2026-07-01T10:12:00.000Z',
    };

    const cached = cacheActivitySubmissionForSession(
      [first, second],
      replacement,
      { limit: 2 },
    );

    expect(cached.data.map((item) => item.id)).toEqual([
      'submission-1',
      'submission-2',
    ]);
    expect(cached.data[0].updatedAt).toBe('2026-07-01T10:12:00.000Z');
  });
});
