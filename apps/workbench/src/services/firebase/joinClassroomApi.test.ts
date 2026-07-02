import { describe, expect, it, vi } from 'vitest';
import {
  buildJoinCodeHash as buildApiJoinCodeHash,
  buildStudentMembershipDocument,
  handleJoinClassroomBody,
  parseJoinClassroomRequest,
  resolveAdminCredentialConfig,
} from '../../../api/join-classroom';
import { buildJoinCodeHash as buildClientJoinCodeHash } from './classroomJoinCode';

describe('join-classroom API helpers', () => {
  it('normalizes and validates a trusted classroom join request', () => {
    const result = parseJoinClassroomRequest({
      idToken: 'token-123',
      classCode: ' chem/101 ',
      joinCode: ' a1 b2 ',
      displayName: ' 3조   학생A ',
      anonymousStudentId: ' anon-1 ',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'token-123',
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        displayName: '3조 학생A',
        anonymousStudentId: 'anon-1',
      },
    });
  });

  it('keeps server and client join-code hashing consistent', () => {
    const input = { classCode: ' chem/101 ', joinCode: ' a1 b2 ' };

    expect(buildApiJoinCodeHash(input)).toBe(buildClientJoinCodeHash(input));
  });

  it('builds a minimal student membership document without student personal identifiers', () => {
    expect(
      buildStudentMembershipDocument({
        uid: 'firebase-student-uid',
        displayName: '익명 학생',
        anonymousStudentId: 'anon-123',
        now: '2026-07-02T00:00:00.000Z',
      }),
    ).toEqual({
      uid: 'firebase-student-uid',
      displayName: '익명 학생',
      anonymousStudentId: 'anon-123',
      joinedAt: '2026-07-02T00:00:00.000Z',
      lastActiveAt: '2026-07-02T00:00:00.000Z',
    });
  });

  it('resolves server-only Firebase Admin credentials from a base64 service account', () => {
    const encoded = Buffer.from(
      JSON.stringify({
        project_id: 'molecular-modeling',
        client_email: 'firebase-admin@test.iam.gserviceaccount.com',
        private_key: 'test-key-line-1\ntest-key-line-2\n',
      }),
      'utf8',
    ).toString('base64');

    expect(
      resolveAdminCredentialConfig({
        FIREBASE_SERVICE_ACCOUNT_BASE64: encoded,
      }),
    ).toEqual({
      projectId: 'molecular-modeling',
      clientEmail: 'firebase-admin@test.iam.gserviceaccount.com',
      privateKey: 'test-key-line-1\ntest-key-line-2\n',
    });
  });

  it('creates a membership document only after token and classroom checks pass', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);

    const response = await handleJoinClassroomBody(
      {
        idToken: 'token-123',
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        displayName: '익명 학생',
        anonymousStudentId: 'anon-123',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'firebase-student-uid' }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          joinEnabled: true,
          joinCodeHash: buildApiJoinCodeHash({
            classCode: 'CHEM-101',
            joinCode: 'A1B2',
          }),
        }),
        writeMembership,
        now: () => '2026-07-02T00:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'joined',
      classCode: 'CHEM-101',
    });
    expect(writeMembership).toHaveBeenCalledWith(
      'CHEM-101',
      'firebase-student-uid',
      expect.objectContaining({
        uid: 'firebase-student-uid',
        anonymousStudentId: 'anon-123',
      }),
    );
  });

  it('does not create membership when the classroom is missing', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);

    const response = await handleJoinClassroomBody(
      {
        idToken: 'token-123',
        classCode: 'CHEM-404',
        joinCode: 'A1B2',
        displayName: '익명 학생',
        anonymousStudentId: 'anon-123',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'firebase-student-uid' }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: false,
        }),
        writeMembership,
        now: () => '2026-07-02T00:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      ok: false,
      status: 'classroom_not_found',
    });
    expect(writeMembership).not.toHaveBeenCalled();
  });

  it('rejects membership creation when the join code does not match the classroom hash', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);

    const response = await handleJoinClassroomBody(
      {
        idToken: 'token-123',
        classCode: 'CHEM-101',
        joinCode: 'WRONG',
        displayName: '익명 학생',
        anonymousStudentId: 'anon-123',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'firebase-student-uid' }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          joinEnabled: true,
          joinCodeHash: buildApiJoinCodeHash({
            classCode: 'CHEM-101',
            joinCode: 'A1B2',
          }),
        }),
        writeMembership,
        now: () => '2026-07-02T00:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'join_disabled',
    });
    expect(writeMembership).not.toHaveBeenCalled();
  });
});
