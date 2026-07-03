import { describe, expect, it, vi } from 'vitest';
import { updateFeedbackWithTrustedEndpoint } from './updateFeedbackService';
import type { ActivitySubmission, TeacherFeedbackDraft } from '../../types/feedback';

const submission: ActivitySubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: '익명 학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    appMode: 'activity',
    userMode: 'student',
    activityTitle: '물 분자 구조 그리기',
    moleculeName: '물',
    studentPrediction: {
      predictedFormula: '',
      predictedMolecularWeight: '',
      drawingReason: '',
    },
    rdkitValidation: {
      isValid: false,
    },
    threeDObservation: {
      has3DStructure: false,
    },
    measurements: [],
    activityAnswers: [],
    exportNotice: '수업 활동 기록용입니다.',
  },
  status: 'submitted',
};

const feedback: TeacherFeedbackDraft = {
  id: 'feedback-1',
  createdAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  source: 'local_guardrail_preview',
  summary: '피드백 초안입니다.',
  strengths: ['제출 자료를 정리했습니다.'],
  improvementQuestions: ['분자식과 모양을 비교해 보세요.'],
  studentMessage: '교사가 확인한 피드백입니다.',
  teacherReviewNote: '교사 검토 완료',
  reviewRequired: true,
};

describe('updateFeedbackWithTrustedEndpoint', () => {
  it('does not call the server when the teacher ID token is missing', async () => {
    const fetchImpl = vi.fn();

    const result = await updateFeedbackWithTrustedEndpoint({
      submission,
      feedback,
      status: 'feedback_returned',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('교사 인증 토큰');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts feedback updates to the trusted endpoint', async () => {
    const updatedSubmission = {
      ...submission,
      status: 'feedback_returned' as const,
      teacherFeedback: feedback,
      feedbackReturnedAt: '2026-07-02T01:00:00.000Z',
    };
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: 'updated',
        classCode: 'CHEM-101',
        submission: updatedSubmission,
        studentMessage: '서버 제출함에도 교사 피드백을 전달했습니다.',
        developerMessage: 'updated',
      }),
    });

    const result = await updateFeedbackWithTrustedEndpoint({
      submission,
      feedback,
      status: 'feedback_returned',
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(updatedSubmission);
    expect(fetchImpl).toHaveBeenCalledWith('/api/update-feedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idToken: 'teacher-id-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
        feedback,
        status: 'feedback_returned',
      }),
    });
  });

  it('keeps student-facing and developer-facing failure messages separated', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        ok: false,
        status: 'unauthorized',
        classCode: 'CHEM-101',
        studentMessage: '이 수업방 피드백을 저장할 교사 권한을 확인하지 못했습니다.',
        developerMessage: 'updateFeedback rejected classroom teacher access',
      }),
    });

    const result = await updateFeedbackWithTrustedEndpoint({
      submission,
      feedback,
      status: 'feedback_returned',
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('교사 권한');
    expect(result.developerLogs.join('\n')).toContain(
      'updateFeedback rejected classroom teacher access',
    );
  });
});
