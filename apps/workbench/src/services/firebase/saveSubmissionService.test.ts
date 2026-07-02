import { describe, expect, it, vi } from 'vitest';
import type { ActivitySubmission } from '../../types/feedback';
import { saveSubmissionWithTrustedEndpoint } from './saveSubmissionService';

const submission: ActivitySubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'CHEM111',
  studentDisplayName: 'QA 학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    appMode: 'activity',
    userMode: 'student',
    activityId: 'draw-carbon-dioxide',
    activityTitle: '이산화탄소 분자 구조 그리기',
    moleculeName: '이산화탄소',
    studentPrediction: {},
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

describe('saveSubmissionWithTrustedEndpoint', () => {
  it('does not call the server when the student ID token is missing', async () => {
    const fetchImpl = vi.fn();

    const result = await saveSubmissionWithTrustedEndpoint({
      submission,
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('서버 제출 인증 정보');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts a student submission to the trusted endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: 'saved',
        classCode: 'CHEM111',
        submission,
        studentMessage: '활동 결과를 서버 제출함에도 저장했습니다.',
        developerMessage: 'saved',
      }),
    });

    const result = await saveSubmissionWithTrustedEndpoint({
      submission,
      idToken: 'student-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(submission);
    expect(fetchImpl).toHaveBeenCalledWith('/api/save-submission', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idToken: 'student-id-token',
        submission,
      }),
    });
  });

  it('keeps student-facing and developer-facing failure messages separated', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        ok: false,
        status: 'membership_required',
        classCode: 'CHEM111',
        studentMessage: '서버 수업방 입장 확인이 필요합니다.',
        developerMessage: 'saveSubmission membership missing',
      }),
    });

    const result = await saveSubmissionWithTrustedEndpoint({
      submission,
      idToken: 'student-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('입장 확인');
    expect(result.developerLogs.join('\n')).toContain(
      'saveSubmission membership missing',
    );
  });
});
