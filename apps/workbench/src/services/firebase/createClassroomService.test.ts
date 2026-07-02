import { describe, expect, it, vi } from 'vitest';
import { createClassroomWithTrustedEndpoint } from './createClassroomService';

const classroomDraft = {
  title: '고1 결합 수업',
  classCode: 'CHEM-101',
  joinCode: 'A1B2',
  activityTemplateIds: ['draw-water'],
};

describe('createClassroomWithTrustedEndpoint', () => {
  it('does not call the server when the teacher ID token is missing', async () => {
    const fetchImpl = vi.fn();

    const result = await createClassroomWithTrustedEndpoint({
      draft: classroomDraft,
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('교사 인증 토큰');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts a classroom creation request to the trusted endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        status: 'created',
        classCode: 'CHEM-101',
        studentMessage: '서버 수업방을 만들었습니다.',
        developerMessage: 'created',
      }),
    });

    const result = await createClassroomWithTrustedEndpoint({
      draft: classroomDraft,
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(true);
    expect(result.data.classCode).toBe('CHEM-101');
    expect(fetchImpl).toHaveBeenCalledWith('/api/create-classroom', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idToken: 'teacher-id-token',
        draft: classroomDraft,
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
        studentMessage: '교사 권한이 확인된 계정만 서버 수업방을 만들 수 있습니다.',
        developerMessage: 'createClassroom rejected teacher claim',
      }),
    });

    const result = await createClassroomWithTrustedEndpoint({
      draft: classroomDraft,
      idToken: 'teacher-id-token',
      fetchImpl: fetchImpl as never,
    });

    expect(result.ok).toBe(false);
    expect(result.studentMessage).toContain('교사 권한');
    expect(result.developerLogs.join('\n')).toContain(
      'createClassroom rejected teacher claim',
    );
  });
});
