import { describe, expect, it, vi } from 'vitest';
import { loadStudentFeedbackWithTrustedEndpoint } from './studentFeedbackService';

const returnedSubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T01:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: '익명 학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    activityTitle: '물 분자 구조 그리기',
  },
  status: 'feedback_returned' as const,
  teacherFeedback: {
    id: 'feedback-1',
    studentMessage: '교사가 확인한 피드백입니다.',
  },
  feedbackReturnedAt: '2026-07-02T01:00:00.000Z',
};

describe('loadStudentFeedbackWithTrustedEndpoint', () => {
  it('does not call the server when the student ID token is missing', async () => {
    const fetchImpl = vi.fn();

    const result = await loadStudentFeedbackWithTrustedEndpoint({
      classCode: 'CHEM-101',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('학생 인증 토큰');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts a returned feedback request to the trusted endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: 'loaded',
        classCode: 'CHEM-101',
        submissions: [returnedSubmission],
        studentMessage: '교사가 전달한 피드백 1개를 불러왔습니다.',
        developerMessage: 'loaded',
      }),
    });

    const result = await loadStudentFeedbackWithTrustedEndpoint({
      classCode: 'chem-101',
      idToken: 'student-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([returnedSubmission]);
    expect(fetchImpl).toHaveBeenCalledWith('/api/list-student-feedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idToken: 'student-id-token',
        classCode: 'CHEM-101',
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
        classCode: 'CHEM-101',
        studentMessage: '수업방 입장 확인이 끝난 학생만 교사 피드백을 볼 수 있습니다.',
        developerMessage: 'listStudentFeedback membership missing',
      }),
    });

    const result = await loadStudentFeedbackWithTrustedEndpoint({
      classCode: 'CHEM-101',
      idToken: 'student-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.studentMessage).toContain('수업방 입장');
    expect(result.developerLogs.join('\n')).toContain(
      'listStudentFeedback membership missing',
    );
  });
});
