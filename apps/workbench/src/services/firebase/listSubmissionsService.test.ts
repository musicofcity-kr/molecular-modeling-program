import { describe, expect, it, vi } from 'vitest';
import { loadClassroomSubmissionsWithTrustedEndpoint } from './listSubmissionsService';

const submission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: 'QA-학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    activityTitle: '물 분자 구조 그리기',
  },
  status: 'submitted' as const,
};

describe('loadClassroomSubmissionsWithTrustedEndpoint', () => {
  it('does not call the server when the teacher ID token is missing', async () => {
    const fetchImpl = vi.fn();

    const result = await loadClassroomSubmissionsWithTrustedEndpoint({
      classCode: 'CHEM-101',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('교사 인증 토큰');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts a submission list request to the trusted endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: 'loaded',
        classCode: 'CHEM-101',
        submissions: [submission],
        studentMessage: '서버 제출함에서 1개의 제출 자료를 불러왔습니다.',
        developerMessage: 'loaded',
      }),
    });

    const result = await loadClassroomSubmissionsWithTrustedEndpoint({
      classCode: 'chem-101',
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([submission]);
    expect(fetchImpl).toHaveBeenCalledWith('/api/list-submissions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idToken: 'teacher-id-token',
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
        status: 'unauthorized',
        classCode: 'CHEM-101',
        studentMessage: '이 수업방 제출 목록을 볼 교사 권한을 확인하지 못했습니다.',
        developerMessage: 'listSubmissions rejected classroom teacher access',
      }),
    });

    const result = await loadClassroomSubmissionsWithTrustedEndpoint({
      classCode: 'CHEM-101',
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.data).toEqual([]);
    expect(result.studentMessage).toContain('교사 권한');
    expect(result.developerLogs.join('\n')).toContain(
      'listSubmissions rejected classroom teacher access',
    );
  });
});
