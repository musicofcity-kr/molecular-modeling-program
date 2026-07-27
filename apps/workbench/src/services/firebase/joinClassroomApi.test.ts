import { describe, expect, it, vi } from 'vitest';
import {
  buildJoinCodeHash as buildApiJoinCodeHash,
  buildJoinAttemptCounterDocumentId,
  buildLegacyJoinCodeHash,
  consumeJoinAttemptCounterSlot,
  buildUnsaltedServerJoinCodeHash,
  buildStudentMembershipDocument,
  handleJoinClassroomBody,
  parseJoinClassroomRequest,
  resolveAdminCredentialConfig,
  type JoinAttemptCounter,
} from '../../../api/join-classroom';

const V3_JOIN_CODE_SALT = '0123456789abcdef0123456789abcdef';
const TEST_NOW = '2026-07-02T00:00:00.000Z';

function createJoinAttemptDependencies(
  initialCounter: JoinAttemptCounter | null = null,
) {
  let counter = initialCounter;

  return {
    consumeJoinAttemptSlot: vi.fn(
      async (
        classCode: string,
        uid: string,
        nowMs: number,
        updatedAt: string,
      ) => {
        void classCode;
        void uid;
        const result = consumeJoinAttemptCounterSlot(
          counter,
          nowMs,
          updatedAt,
        );

        if (result.allowed) {
          counter = result.counter;
        }

        return result;
      },
    ),
    readCounter: () => counter,
  };
}

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

  it('builds a versioned salted SHA-256 join-code hash for server checks', () => {
    const input = { classCode: ' chem/101 ', joinCode: ' a1 b2 ' };

    expect(buildApiJoinCodeHash({ ...input, joinCodeSalt: V3_JOIN_CODE_SALT })).toMatch(
      /^server-join-code-v3-[a-f0-9]{64}$/,
    );
    expect(buildApiJoinCodeHash({ ...input, joinCodeSalt: V3_JOIN_CODE_SALT })).toBe(
      buildApiJoinCodeHash({
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        joinCodeSalt: V3_JOIN_CODE_SALT,
      }),
    );
    expect(buildApiJoinCodeHash({ ...input, joinCodeSalt: V3_JOIN_CODE_SALT })).not.toBe(
      buildApiJoinCodeHash({
        ...input,
        joinCodeSalt: 'abcdef0123456789abcdef0123456789',
      }),
    );
  });

  it('builds a stable opaque counter document id from class and Firebase uid', () => {
    expect(
      buildJoinAttemptCounterDocumentId(' chem/101 ', 'student/uid@example.com'),
    ).toMatch(/^join-attempt-v2-[a-f0-9]{64}$/);
    expect(
      buildJoinAttemptCounterDocumentId('CHEM-101', 'student/uid@example.com'),
    ).toBe(
      buildJoinAttemptCounterDocumentId(
        ' chem/101 ',
        'student/uid@example.com',
      ),
    );
    expect(
      buildJoinAttemptCounterDocumentId('CHEM-101', 'student-a'),
    ).not.toBe(buildJoinAttemptCounterDocumentId('CHEM-101', 'student-b'));
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
    const joinAttempts = createJoinAttemptDependencies();

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
            joinCodeSalt: V3_JOIN_CODE_SALT,
          }),
          joinCodeSalt: V3_JOIN_CODE_SALT,
          joinCodeVersion: 3,
          activityTemplateIds: [
            'draw-water',
            'draw-methane',
            'draw-ammonia',
            'bad template id',
          ],
        }),
        writeMembership,
        ...joinAttempts,
        now: () => TEST_NOW,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'joined',
      classCode: 'CHEM-101',
      activityTemplateIds: ['draw-water', 'draw-methane', 'draw-ammonia'],
    });
    expect(writeMembership).toHaveBeenCalledWith(
      'CHEM-101',
      'firebase-student-uid',
      expect.objectContaining({
        uid: 'firebase-student-uid',
        anonymousStudentId: 'anon-123',
      }),
    );
    expect(joinAttempts.consumeJoinAttemptSlot).toHaveBeenCalledWith(
      'CHEM-101',
      'firebase-student-uid',
      expect.any(Number),
      TEST_NOW,
    );
  });

  it('keeps existing v1 classrooms joinable when joinCodeVersion is missing', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);
    const joinAttempts = createJoinAttemptDependencies();

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
          joinCodeHash: buildLegacyJoinCodeHash({
            classCode: 'CHEM-101',
            joinCode: 'A1B2',
          }),
        }),
        writeMembership,
        ...joinAttempts,
        now: () => TEST_NOW,
      },
    );

    expect(response.status).toBe(200);
    expect(writeMembership).toHaveBeenCalled();
  });

  it('keeps existing v2 server classrooms joinable when joinCodeVersion is 2', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);
    const joinAttempts = createJoinAttemptDependencies();

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
          joinCodeHash: buildUnsaltedServerJoinCodeHash({
            classCode: 'CHEM-101',
            joinCode: 'A1B2',
          }),
          joinCodeVersion: 2,
        }),
        writeMembership,
        ...joinAttempts,
        now: () => TEST_NOW,
      },
    );

    expect(response.status).toBe(200);
    expect(writeMembership).toHaveBeenCalled();
  });

  it('rejects v3 server classrooms when the stored salt is missing', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);
    const joinAttempts = createJoinAttemptDependencies();

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
            joinCodeSalt: V3_JOIN_CODE_SALT,
          }),
          joinCodeVersion: 3,
        }),
        writeMembership,
        ...joinAttempts,
        now: () => TEST_NOW,
        nowMs: () => 1000,
      },
    );

    expect(response.status).toBe(403);
    expect(writeMembership).not.toHaveBeenCalled();
  });

  it('does not create membership when the classroom is missing', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);
    const joinAttempts = createJoinAttemptDependencies();

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
        ...joinAttempts,
        now: () => TEST_NOW,
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
    const joinAttempts = createJoinAttemptDependencies();

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
            joinCodeSalt: V3_JOIN_CODE_SALT,
          }),
          joinCodeSalt: V3_JOIN_CODE_SALT,
          joinCodeVersion: 3,
        }),
        writeMembership,
        ...joinAttempts,
        now: () => TEST_NOW,
        nowMs: () => 1000,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'join_disabled',
    });
    expect(writeMembership).not.toHaveBeenCalled();
    expect(joinAttempts.consumeJoinAttemptSlot).toHaveBeenCalledWith(
      'CHEM-101',
      'firebase-student-uid',
      1000,
      TEST_NOW,
    );
    expect(joinAttempts.readCounter()).toMatchObject({
      attemptCount: 1,
      windowStartedAtMs: 1000,
    });
  });

  it('rate limits the 31st join attempt before checking whether its code is correct', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);
    const joinAttempts = createJoinAttemptDependencies({
      attemptCount: 30,
      windowStartedAtMs: 1000,
      updatedAt: TEST_NOW,
    });

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
          get joinCodeHash() {
            throw new Error('blocked attempts must not inspect the join-code hash');
          },
          joinCodeSalt: V3_JOIN_CODE_SALT,
          joinCodeVersion: 3,
        }),
        writeMembership,
        ...joinAttempts,
        now: () => '2026-07-02T00:01:00.000Z',
        nowMs: () => 60_000,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      ok: false,
      status: 'rate_limited',
    });
    expect(writeMembership).not.toHaveBeenCalled();
    expect(joinAttempts.consumeJoinAttemptSlot).toHaveBeenCalledWith(
      'CHEM-101',
      'firebase-student-uid',
      60_000,
      '2026-07-02T00:01:00.000Z',
    );
    expect(joinAttempts.readCounter()).toMatchObject({
      attemptCount: 30,
    });
  });

  it('starts a fresh attempt window after 10 minutes have elapsed', async () => {
    const writeMembership = vi.fn().mockResolvedValue(undefined);
    const joinAttempts = createJoinAttemptDependencies({
      attemptCount: 30,
      windowStartedAtMs: 1000,
      updatedAt: TEST_NOW,
    });

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
            joinCodeSalt: V3_JOIN_CODE_SALT,
          }),
          joinCodeSalt: V3_JOIN_CODE_SALT,
          joinCodeVersion: 3,
        }),
        writeMembership,
        ...joinAttempts,
        now: () => '2026-07-02T00:11:00.000Z',
        nowMs: () => 601_000,
      },
    );

    expect(response.status).toBe(403);
    expect(joinAttempts.consumeJoinAttemptSlot).toHaveBeenCalledWith(
      'CHEM-101',
      'firebase-student-uid',
      601_000,
      '2026-07-02T00:11:00.000Z',
    );
    expect(joinAttempts.readCounter()).toMatchObject({
      attemptCount: 1,
      windowStartedAtMs: 601_000,
    });
  });

  it('atomically consumes 30 per-student slots and blocks later parallel guesses before code checks', async () => {
    const concurrentAttempts = 35;
    let counter: JoinAttemptCounter | null = null;
    const recordedCounts: number[] = [];
    const consumeJoinAttemptSlot = vi.fn(
      async (
        classCode: string,
        uid: string,
        nowMs: number,
        updatedAt: string,
      ) => {
        void classCode;
        void uid;
        const result = consumeJoinAttemptCounterSlot(
          counter,
          nowMs,
          updatedAt,
        );

        if (result.allowed) {
          counter = result.counter;
          recordedCounts.push(result.counter.attemptCount);
        }

        return result;
      },
    );
    const dependencies = {
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'firebase-student-uid' }),
      getClassroom: vi.fn().mockResolvedValue({
        exists: true,
        joinEnabled: true,
        joinCodeHash: buildApiJoinCodeHash({
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          joinCodeSalt: V3_JOIN_CODE_SALT,
        }),
        joinCodeSalt: V3_JOIN_CODE_SALT,
        joinCodeVersion: 3,
      }),
      writeMembership: vi.fn().mockResolvedValue(undefined),
      consumeJoinAttemptSlot,
      now: () => TEST_NOW,
      nowMs: () => 1000,
    };

    const responses = await Promise.all(
      Array.from({ length: concurrentAttempts }, (_, index) =>
        handleJoinClassroomBody(
          {
            idToken: `token-${index}`,
            classCode: 'CHEM-101',
            joinCode: `WRONG${index}`,
            displayName: '익명 학생',
            anonymousStudentId: `anon-${index}`,
          },
          dependencies,
        ),
      ),
    );

    expect(recordedCounts).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    expect(new Set(recordedCounts).size).toBe(30);
    expect(responses.filter((response) => response.status === 403)).toHaveLength(
      30,
    );
    expect(responses.filter((response) => response.status === 429)).toHaveLength(
      5,
    );
  });

  it('keeps one student rate limited without blocking another student in the same class', async () => {
    const counters = new Map<string, JoinAttemptCounter>();
    counters.set('student-a', {
      attemptCount: 30,
      windowStartedAtMs: 1000,
      updatedAt: TEST_NOW,
    });
    const consumeJoinAttemptSlot = vi.fn(
      async (
        classCode: string,
        uid: string,
        nowMs: number,
        updatedAt: string,
      ) => {
        void classCode;
        const result = consumeJoinAttemptCounterSlot(
          counters.get(uid) ?? null,
          nowMs,
          updatedAt,
        );

        if (result.allowed) {
          counters.set(uid, result.counter);
        }

        return result;
      },
    );
    const writeMembership = vi.fn().mockResolvedValue(undefined);
    const verifyIdToken = vi.fn(async (idToken: string) => ({
      uid: idToken === 'token-a' ? 'student-a' : 'student-b',
    }));
    const dependencies = {
      verifyIdToken,
      getClassroom: vi.fn().mockResolvedValue({
        exists: true,
        joinEnabled: true,
        joinCodeHash: buildApiJoinCodeHash({
          classCode: 'CHEM-101',
          joinCode: '1010',
          joinCodeSalt: V3_JOIN_CODE_SALT,
        }),
        joinCodeSalt: V3_JOIN_CODE_SALT,
        joinCodeVersion: 3,
      }),
      writeMembership,
      consumeJoinAttemptSlot,
      now: () => TEST_NOW,
      nowMs: () => 2000,
    };

    const responses = await Promise.all(
      [
        { idToken: 'token-a', joinCode: '1010' },
        { idToken: 'token-b', joinCode: '1010' },
      ].map(({ idToken, joinCode }, index) =>
        handleJoinClassroomBody(
          {
            idToken,
            classCode: 'CHEM-101',
            joinCode,
            displayName: '익명 학생',
            anonymousStudentId: `anon-${index}`,
          },
          dependencies,
        ),
      ),
    );

    expect(responses.map((response) => response.status)).toEqual([429, 200]);
    expect(writeMembership).toHaveBeenCalledOnce();
    expect(writeMembership).toHaveBeenCalledWith(
      'CHEM-101',
      'student-b',
      expect.objectContaining({ uid: 'student-b' }),
    );
  });
});
