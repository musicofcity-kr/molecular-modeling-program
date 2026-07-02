import { describe, expect, it, vi } from 'vitest';
import {
  buildClassroomWriteDocuments,
  buildJoinCodeHash as buildApiJoinCodeHash,
  handleCreateClassroomBody,
  parseCreateClassroomRequest,
} from '../../../api/create-classroom';
import { buildJoinCodeHash as buildClientJoinCodeHash } from './classroomJoinCode';

describe('create-classroom API helpers', () => {
  it('normalizes and validates a trusted classroom creation request', () => {
    const result = parseCreateClassroomRequest({
      idToken: 'teacher-token',
      draft: {
        title: ' 고1   화학 ',
        classCode: ' chem/101 ',
        joinCode: ' a1 b2 ',
        activityTemplateIds: ['draw-water', 'draw-water', 'bad id'],
      },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'teacher-token',
        draft: {
          title: '고1 화학',
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          activityTemplateIds: ['draw-water'],
        },
      },
    });
  });

  it('keeps server and client join-code hashing consistent', () => {
    const input = { classCode: ' chem/101 ', joinCode: ' a1 b2 ' };

    expect(buildApiJoinCodeHash(input)).toBe(buildClientJoinCodeHash(input));
  });

  it('builds classroom documents without exposing the raw join code', () => {
    const documents = buildClassroomWriteDocuments({
      draft: {
        title: '고1 결합 수업',
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        activityTemplateIds: ['draw-water', 'draw-ethanol'],
      },
      teacherUid: 'teacher-uid',
      now: '2026-07-02T00:00:00.000Z',
    });

    expect(documents.classroom.ownerTeacherUid).toBe('teacher-uid');
    expect(documents.classroom.teacherUids['teacher-uid']).toBe(true);
    expect(documents.classroom.joinCodeHash).toBe(
      buildClientJoinCodeHash({ classCode: 'CHEM-101', joinCode: 'A1B2' }),
    );
    expect(documents.classroom).not.toHaveProperty('joinCode');
    expect(documents.publicInfo.activityTemplateIds).toEqual([
      'draw-water',
      'draw-ethanol',
    ]);
    expect(Object.keys(documents.activityTemplates)).toEqual([
      'draw-water',
      'draw-ethanol',
    ]);
  });

  it('creates a classroom only when the ID token has a teacher claim', async () => {
    const writeClassroom = vi.fn().mockResolvedValue(undefined);

    const response = await handleCreateClassroomBody(
      {
        idToken: 'teacher-token',
        draft: {
          title: '고1 결합 수업',
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          activityTemplateIds: ['draw-water'],
        },
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'teacher-uid',
          teacher: true,
        }),
        writeClassroom,
        now: () => '2026-07-02T00:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'created',
      classCode: 'CHEM-101',
    });
    expect(writeClassroom).toHaveBeenCalledWith(
      'CHEM-101',
      expect.objectContaining({
        classroom: expect.objectContaining({
          ownerTeacherUid: 'teacher-uid',
        }),
      }),
    );
  });

  it('rejects classroom creation when the teacher claim is missing', async () => {
    const writeClassroom = vi.fn().mockResolvedValue(undefined);

    const response = await handleCreateClassroomBody(
      {
        idToken: 'teacher-token',
        draft: {
          title: '고1 결합 수업',
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          activityTemplateIds: ['draw-water'],
        },
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'teacher-uid',
        }),
        writeClassroom,
        now: () => '2026-07-02T00:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'unauthorized',
    });
    expect(writeClassroom).not.toHaveBeenCalled();
  });
});
