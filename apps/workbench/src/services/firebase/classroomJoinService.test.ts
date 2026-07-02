import { describe, expect, it } from 'vitest';
import {
  JOIN_CLASSROOM_DEFERRED_MESSAGE,
  JOIN_CLASSROOM_LOCAL_ONLY_MESSAGE,
  joinClassroomWithTrustedEndpoint,
} from './classroomJoinService';

describe('classroomJoinService', () => {
  it('keeps classroom joining local when Firebase anonymous UID is unavailable', async () => {
    await expect(
      joinClassroomWithTrustedEndpoint({
        classCode: 'CHEM-101',
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
        'joinClassroom trusted endpoint is not implemented yet; no network call or Firestore membership write attempted.',
    });
  });
});
