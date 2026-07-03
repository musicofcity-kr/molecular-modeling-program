import { describe, expect, it, vi } from 'vitest';
import { createFeedbackDraftWithTrustedEndpoint } from './feedbackDraftService';
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
      predictedFormula: 'H2O',
      predictedMolecularWeight: '18',
      drawingReason: '산소와 수소가 결합한다고 생각했습니다.',
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
  },
  status: 'submitted',
};

const feedback: TeacherFeedbackDraft = {
  id: 'feedback-1',
  createdAt: '2026-07-02T01:00:00.000Z',
  updatedAt: '2026-07-02T01:00:00.000Z',
  source: 'local_guardrail_preview',
  summary: '물 활동 피드백 초안입니다.',
  strengths: ['구조 확인 결과를 근거로 비교했습니다.'],
  improvementQuestions: ['비공유 전자쌍의 영향을 설명해 보세요.'],
  studentMessage: '교사가 확인할 피드백 초안입니다.',
  teacherReviewNote: '교사 확인 필요',
  reviewRequired: true,
};

describe('createFeedbackDraftWithTrustedEndpoint', () => {
  it('does not call the server when the teacher ID token is missing', async () => {
    const fetchImpl = vi.fn();

    const result = await createFeedbackDraftWithTrustedEndpoint({
      submission,
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('교사 인증 토큰');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts only class code and submission id to the trusted endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: 'created',
        classCode: 'CHEM-101',
        feedback,
        studentMessage: '서버에서 피드백 초안을 만들었습니다.',
        developerMessage: 'draft created',
      }),
    });

    const result = await createFeedbackDraftWithTrustedEndpoint({
      submission,
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/api/create-feedback-draft', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idToken: 'teacher-id-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
      }),
    });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).not.toHaveProperty(
      'submission',
    );
  });

  it('keeps student-facing and developer-facing failure messages separated', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        ok: false,
        status: 'unauthorized',
        classCode: 'CHEM-101',
        studentMessage:
          '이 수업방 피드백 초안을 만들 교사 권한을 확인하지 못했습니다.',
        developerMessage: 'createFeedbackDraft rejected classroom teacher access',
      }),
    });

    const result = await createFeedbackDraftWithTrustedEndpoint({
      submission,
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('교사 권한');
    expect(result.developerLogs.join('\n')).toContain(
      'createFeedbackDraft rejected classroom teacher access',
    );
  });
});
