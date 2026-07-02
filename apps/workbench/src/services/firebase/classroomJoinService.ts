import type { ClassroomJoinStatus } from '../../types/session';

export type JoinClassroomInput = {
  classCode: string;
  displayName: string;
  anonymousStudentId: string;
  firebaseUid?: string;
  idToken?: string;
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

export const JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE =
  '수업코드 서버 확인을 완료하지 못했습니다. 현재 브라우저에서 활동을 계속할 수 있으며, 서버 제출함은 교사에게 확인해 주세요.';

export const JOIN_CLASSROOM_JOINED_MESSAGE =
  '수업코드 확인이 완료되었습니다. 활동 결과를 서버 제출함에 보낼 수 있습니다.';

type JoinClassroomOptions = {
  endpoint?: string;
  fetcher?: typeof fetch;
};

type JoinClassroomApiResponse = {
  ok?: boolean;
  status?: string;
  classCode?: string;
  studentMessage?: string;
  developerMessage?: string;
};

export async function joinClassroomWithTrustedEndpoint(
  input: JoinClassroomInput,
  options: JoinClassroomOptions = {},
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

  if (!input.idToken) {
    return deferredJoinResult(
      input.classCode,
      'joinClassroom skipped: Firebase ID token is missing; no trusted endpoint call attempted.',
    );
  }

  const fetcher = options.fetcher ?? globalThis.fetch;

  if (!fetcher) {
    return deferredJoinResult(
      input.classCode,
      'joinClassroom skipped: fetch is not available in this runtime.',
    );
  }

  const endpoint = options.endpoint ?? '/api/join-classroom';

  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        idToken: input.idToken,
        classCode: input.classCode,
        displayName: input.displayName,
        anonymousStudentId: input.anonymousStudentId,
      }),
    });
    const body = await parseJoinClassroomResponse(response);

    if (response.ok && body.ok === true && body.status === 'joined') {
      return {
        ok: true,
        status: 'joined',
        classCode: body.classCode ?? input.classCode,
        studentMessage:
          body.studentMessage ?? JOIN_CLASSROOM_JOINED_MESSAGE,
        developerMessage:
          body.developerMessage ??
          `joinClassroom succeeded: classCode=${body.classCode ?? input.classCode}`,
      };
    }

    return {
      ok: true,
      status: 'deferred_until_trusted_endpoint',
      classCode: input.classCode,
      studentMessage:
        body.studentMessage ?? JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
      developerMessage:
        body.developerMessage ??
        `joinClassroom endpoint rejected request: status=${response.status}`,
    };
  } catch (error) {
    return deferredJoinResult(
      input.classCode,
      `joinClassroom endpoint request failed: ${getErrorMessage(error)}`,
      JOIN_CLASSROOM_SERVER_FALLBACK_MESSAGE,
    );
  }
}

async function parseJoinClassroomResponse(
  response: Response,
): Promise<JoinClassroomApiResponse> {
  try {
    return (await response.json()) as JoinClassroomApiResponse;
  } catch {
    return {};
  }
}

function deferredJoinResult(
  classCode: string,
  developerMessage: string,
  studentMessage = JOIN_CLASSROOM_DEFERRED_MESSAGE,
): JoinClassroomResult {
  return {
    ok: true,
    status: 'deferred_until_trusted_endpoint',
    classCode,
    studentMessage,
    developerMessage,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
