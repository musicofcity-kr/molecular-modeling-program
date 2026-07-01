import { describe, expect, it, vi } from 'vitest';
import type { ActivitySubmission } from '../types/feedback';
import { createTeacherFeedbackDraft } from './aiFeedbackService';

const submission: ActivitySubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-01T10:10:00.000Z',
  updatedAt: '2026-07-01T10:10:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: '3조-학생A',
  anonymousStudentId: 'student-123',
  status: 'submitted',
  snapshot: {
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
    comparisonObservation: {
      available: true,
      observedSimilarities: '둘 다 굽은형이다.',
    },
    activityAnswers: [],
    exportNotice: '수업 활동 기록용입니다.',
  },
};

describe('ai feedback service', () => {
  it('creates a local guardrail draft when no AI endpoint is configured', async () => {
    const result = await createTeacherFeedbackDraft(submission, {
      endpoint: '',
      now: '2026-07-01T10:20:00.000Z',
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.feedback.source).toBe('local_guardrail_preview');
      expect(result.feedback.reviewRequired).toBe(true);
      expect(result.feedback.studentMessage).toContain('점수나 등급이 아닙니다');
      expect(result.feedback.studentMessage).toContain('물 활동 피드백');
    }
  });

  it('posts a guarded payload to a configured feedback endpoint', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          summary: 'AI 초안',
          strengths: ['구조 확인값을 비교했습니다.'],
          improvementQuestions: ['3D 자료의 출처를 설명해 볼까요?'],
          studentMessage: '교사가 확인할 피드백 초안입니다.',
          teacherReviewNote: '교사 검토 필요',
        }),
        { status: 200 },
      ),
    );

    const result = await createTeacherFeedbackDraft(submission, {
      endpoint: 'https://example.test/api/feedback',
      fetcher,
      now: '2026-07-01T10:20:00.000Z',
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [, init] = fetcher.mock.calls[0] as unknown as [
      RequestInfo | URL,
      RequestInit | undefined,
    ];
    const payload = JSON.parse(String(init?.body));

    expect(payload.guardrails.noAutoGrade).toBe(true);
    expect(payload.guardrails.teacherReviewRequired).toBe(true);
    expect(payload.submission.activityTitle).toBe('물 분자 구조 그리기');
    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.feedback.source).toBe('ai_api');
      expect(result.feedback.studentMessage).toBe('교사가 확인할 피드백 초안입니다.');
    }
  });
});
