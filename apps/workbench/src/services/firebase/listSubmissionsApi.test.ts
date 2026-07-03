import { describe, expect, it, vi } from 'vitest';
import {
  handleListSubmissionsBody,
  normalizeJoinClassCode,
  parseListSubmissionsRequest,
} from '../../../api/list-submissions';

const submission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: 'QA-학생',
  anonymousStudentId: 'student-1',
  studentUid: 'student-uid',
  snapshot: {
    id: 'result-1',
    activityTitle: '물 분자 구조 그리기',
  },
  status: 'submitted' as const,
};

describe('list-submissions API helpers', () => {
  it('normalizes and validates a trusted submission list request', () => {
    const result = parseListSubmissionsRequest({
      idToken: 'teacher-token',
      classCode: ' chem/101 ',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
      },
    });
    expect(normalizeJoinClassCode(' chem/101 ')).toBe('CHEM-101');
  });

  it('returns submissions only for an assigned teacher', async () => {
    const response = await handleListSubmissionsBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'teacher-uid',
          teacher: true,
        }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          ownerTeacherUid: 'teacher-uid',
          teacherUids: {
            'teacher-uid': true,
          },
        }),
        listSubmissions: vi.fn().mockResolvedValue([submission]),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'loaded',
      classCode: 'CHEM-101',
      submissions: [submission],
    });
  });

  it('rejects a teacher who is not assigned to the classroom', async () => {
    const listSubmissions = vi.fn().mockResolvedValue([submission]);
    const response = await handleListSubmissionsBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'other-teacher',
          teacher: true,
        }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          ownerTeacherUid: 'teacher-uid',
          teacherUids: {
            'teacher-uid': true,
          },
        }),
        listSubmissions,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'unauthorized',
    });
    expect(listSubmissions).not.toHaveBeenCalled();
  });
});
