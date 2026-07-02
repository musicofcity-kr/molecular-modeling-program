import { describe, expect, it, vi } from 'vitest';
import {
  JOIN_CLASSROOM_DEFERRED_MESSAGE,
  JOIN_CLASSROOM_JOINED_MESSAGE,
  JOIN_CLASSROOM_LOCAL_ONLY_MESSAGE,
  JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
  joinClassroomWithTrustedEndpoint,
} from './classroomJoinService';

describe('classroomJoinService', () => {
  it('keeps classroom joining local when Firebase anonymous UID is unavailable', async () => {
    await expect(
      joinClassroomWithTrustedEndpoint({
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        displayName: '익명 학생',
        anonymousStudentId: 'student-local',
      }),
    ).resolves.toMatchObject({
      ok: true,
      status: 'local_session_only',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_LOCAL_ONLY_MESSAGE,
    });
  });

  it('defers trusted membership creation instead of writing Firestore from the browser', async () => {
    await expect(
      joinClassroomWithTrustedEndpoint({
        classCode: 'CHEM-101',
        joinCode: 'A1B2',
        displayName: '익명 학생',
        anonymousStudentId: 'student-local',
        firebaseUid: 'firebase-student-uid',
      }),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_DEFERRED_MESSAGE,
      developerMessage:
        'joinClassroom skipped: Firebase ID token is missing; no trusted endpoint call attempted.',
    });
  });

  it('calls the trusted classroom join endpoint when Firebase ID token exists', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          status: 'joined',
          classCode: 'CHEM-101',
          studentMessage: JOIN_CLASSROOM_JOINED_MESSAGE,
          developerMessage: 'membership created',
        }),
        { status: 200 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'joined',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_JOINED_MESSAGE,
    });

    expect(fetcher).toHaveBeenCalledWith(
      '/api/join-classroom',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      idToken: 'firebase-id-token',
      classCode: 'CHEM-101',
      joinCode: 'A1B2',
      displayName: '익명 학생',
      anonymousStudentId: 'student-local',
    });
  });

  it('keeps the student in local activity flow when the trusted endpoint rejects the join', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: false,
          status: 'classroom_not_found',
          studentMessage: '수업코드를 서버에서 확인하지 못했습니다.',
          developerMessage: 'classroom missing',
        }),
        { status: 404 },
      ),
    );

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-404',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-404',
      studentMessage: '수업코드를 서버에서 확인하지 못했습니다.',
      developerMessage: 'classroom missing',
    });
  });

  it('keeps a student-safe fallback when the trusted endpoint request fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network down'));

    await expect(
      joinClassroomWithTrustedEndpoint(
        {
          classCode: 'CHEM-101',
          joinCode: 'A1B2',
          displayName: '익명 학생',
          anonymousStudentId: 'student-local',
          firebaseUid: 'firebase-student-uid',
          idToken: 'firebase-id-token',
        },
        { fetcher },
      ),
    ).resolves.toMatchObject({
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: 'CHEM-101',
      studentMessage: JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
      developerMessage: 'joinClassroom endpoint request failed: network down',
    });
  });
});
