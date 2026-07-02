import type {
  ClassroomDraft,
  ClassroomRepositoryOutcome,
} from './classroomRepository';

type CreateClassroomWithTrustedEndpointInput = {
  draft: ClassroomDraft;
  idToken?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

type CreateClassroomApiPayload = {
  ok?: unknown;
  status?: unknown;
  classCode?: unknown;
  studentMessage?: unknown;
  developerMessage?: unknown;
};

const DEFAULT_CREATE_CLASSROOM_ENDPOINT = '/api/create-classroom';

export async function createClassroomWithTrustedEndpoint(
  input: CreateClassroomWithTrustedEndpointInput,
): Promise<ClassroomRepositoryOutcome<{ classCode: string }>> {
  const classCode = input.draft.classCode.trim().toUpperCase();

  if (!input.idToken) {
    return {
      ok: false,
      data: { classCode },
      studentMessage:
        '교사 인증 토큰이 없어 서버 수업방을 만들 수 없습니다. 다시 로그인해 주세요.',
      developerLogs: ['createClassroom endpoint skipped: idToken is missing.'],
    };
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(
      input.endpoint ?? DEFAULT_CREATE_CLASSROOM_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idToken: input.idToken,
          draft: input.draft,
        }),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | CreateClassroomApiPayload
      | null;
    const studentMessage =
      typeof payload?.studentMessage === 'string'
        ? payload.studentMessage
        : '서버 수업방 생성 응답을 읽지 못했습니다.';
    const developerMessage =
      typeof payload?.developerMessage === 'string'
        ? payload.developerMessage
        : `createClassroom endpoint returned HTTP ${response.status}.`;
    const responseClassCode =
      typeof payload?.classCode === 'string' ? payload.classCode : classCode;

    return {
      ok: response.ok && payload?.ok === true,
      data: { classCode: responseClassCode },
      studentMessage,
      developerLogs: [
        developerMessage,
        `createClassroom endpoint status: ${response.status}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      data: { classCode },
      studentMessage:
        '서버 수업방 생성 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.',
      developerLogs: [
        `createClassroom endpoint fetch failed: ${getErrorMessage(error)}`,
      ],
    };
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
