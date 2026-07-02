import type { ClassroomJoinStatus } from '../../types/session';

export type JoinClassroomInput = {
  classCode: string;
  displayName: string;
  anonymousStudentId: string;
  firebaseUid?: string;
};

export type JoinClassroomResult = {
  ok: true;
  status: ClassroomJoinStatus;
  classCode: string;
  studentMessage: string;
  developerMessage: string;
};

export const JOIN_CLASSROOM_DEFERRED_MESSAGE =
  '수업코드 서버 확인은 다음 단계에서 연결합니다. 오늘 활동은 현재 브라우저에서 계속 진행할 수 있습니다.';

export const JOIN_CLASSROOM_LOCAL_ONLY_MESSAGE =
  '인증 설정이 없어 수업코드는 현재 브라우저에서만 임시로 사용합니다.';

export async function joinClassroomWithTrustedEndpoint(
  input: JoinClassroomInput,
): Promise<JoinClassroomResult> {
  if (!input.firebaseUid) {
    return {
      ok: true,
      status: 'local_session_only',
      classCode: input.classCode,
      studentMessage: JOIN_CLASSROOM_LOCAL_ONLY_MESSAGE,
      developerMessage:
        'joinClassroom skipped: Firebase anonymous UID is missing; no Firestore membership write attempted.',
    };
  }

  return {
    ok: true,
    status: 'deferred_until_trusted_endpoint',
    classCode: input.classCode,
    studentMessage: JOIN_CLASSROOM_DEFERRED_MESSAGE,
    developerMessage:
      'joinClassroom trusted endpoint is not implemented yet; no network call or Firestore membership write attempted.',
  };
}
