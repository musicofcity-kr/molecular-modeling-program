import { describe, expect, it } from 'vitest';
import type { ActivityResultSnapshot } from '../types/activityResult';
import type { StudentSession } from '../types/session';
import {
  createActivitySubmission,
  loadActivitySubmissions,
  saveActivitySubmission,
  updateActivitySubmissionFeedback,
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
  it('creates and stores a classroom submission for teacher feedback', () => {
    const storage = new MemoryStorage();
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

    const saved = saveActivitySubmission(submission, { storage });
    const loaded = loadActivitySubmissions({ storage });

    expect(saved.ok).toBe(true);
    expect(loaded.data).toHaveLength(1);
    expect(loaded.data[0].snapshot.moleculeName).toBe('물');
  });

  it('stores teacher feedback draft and returned feedback status', () => {
    const storage = new MemoryStorage();
    const submission = createActivitySubmission({
      snapshot,
      studentSession,
      id: 'submission-1',
      now: '2026-07-01T10:10:00.000Z',
    });
    const saved = saveActivitySubmission(submission, { storage });
    const feedback = {
      id: 'feedback-1',
      createdAt: '2026-07-01T10:20:00.000Z',
      updatedAt: '2026-07-01T10:20:00.000Z',
      source: 'local_guardrail_preview' as const,
      summary: '물 활동 피드백 초안',
      strengths: ['예측을 먼저 작성했습니다.'],
      improvementQuestions: ['굽은형인 이유를 다시 설명해 볼까요?'],
      studentMessage: '좋은 시작입니다.',
      teacherReviewNote: '교사 확인 필요',
      reviewRequired: true,
    };

    const drafted = updateActivitySubmissionFeedback(
      saved.data,
      'submission-1',
      feedback,
      'feedback_draft',
      { storage },
    );
    const returned = updateActivitySubmissionFeedback(
      drafted.data,
      'submission-1',
      {
        ...feedback,
        studentMessage: '교사가 확인한 피드백입니다.',
      },
      'feedback_returned',
      { storage },
    );

    expect(drafted.data[0].status).toBe('feedback_draft');
    expect(returned.data[0].status).toBe('feedback_returned');
    expect(returned.data[0].teacherFeedback?.studentMessage).toBe(
      '교사가 확인한 피드백입니다.',
    );
    expect(returned.data[0].feedbackReturnedAt).toBeDefined();
  });
});
