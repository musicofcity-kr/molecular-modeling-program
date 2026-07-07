import { describe, expect, it, vi } from 'vitest';
import {
  buildClassroomWriteDocuments,
  buildJoinCodeHash as buildApiJoinCodeHash,
  generateJoinCodeSalt,
  handleCreateClassroomBody,
  parseCreateClassroomRequest,
} from '../../../api/create-classroom';

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

  it('builds a versioned salted SHA-256 join-code hash for new server classrooms', () => {
    const input = { classCode: ' chem/101 ', joinCode: ' a1 b2 ' };
    const joinCodeSalt = '0123456789abcdef0123456789abcdef';

    expect(buildApiJoinCodeHash({ ...input, joinCodeSalt })).toMatch(
      /^server-join-code-v3-[a-f0-9]{64}$/,
    );
    expect(buildApiJoinCodeHash({ ...input, joinCodeSalt })).toBe(
      buildApiJoinCodeHash({
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        joinCodeSalt,
      }),
    );
    expect(buildApiJoinCodeHash({ ...input, joinCodeSalt })).not.toBe(
      buildApiJoinCodeHash({
        ...input,
        joinCodeSalt: 'abcdef0123456789abcdef0123456789',
      }),
    );
  });

  it('generates random classroom join-code salts', () => {
    const salt = generateJoinCodeSalt();

    expect(salt).toMatch(/^[a-f0-9]{32}$/);
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
      buildApiJoinCodeHash({
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        joinCodeSalt: documents.classroom.joinCodeSalt,
      }),
    );
    expect(documents.classroom.joinCodeSalt).toMatch(/^[a-f0-9]{32}$/);
    expect(documents.classroom.joinCodeVersion).toBe(3);
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

  it('rejects duplicate classroom codes instead of overwriting an existing classroom', async () => {
    const duplicateError = Object.assign(new Error('Document already exists'), {
      code: 6,
    });
    const writeClassroom = vi.fn().mockRejectedValue(duplicateError);

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

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      ok: false,
      status: 'classroom_exists',
      classCode: 'CHEM-101',
    });
    expect(body.studentMessage).toContain('이미 같은 수업코드');
    expect(writeClassroom).toHaveBeenCalledOnce();
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
