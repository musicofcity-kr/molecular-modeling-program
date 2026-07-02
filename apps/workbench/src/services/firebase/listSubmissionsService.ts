import type { ActivitySubmission } from '../../types/feedback';
import type { ClassroomRepositoryOutcome } from './classroomRepository';

type LoadClassroomSubmissionsInput = {
  classCode: string;
  idToken?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

type ListSubmissionsApiPayload = {
  ok?: unknown;
  status?: unknown;
  classCode?: unknown;
  submissions?: unknown;
  studentMessage?: unknown;
  developerMessage?: unknown;
};

const DEFAULT_LIST_SUBMISSIONS_ENDPOINT = '/api/list-submissions';

export async function loadClassroomSubmissionsWithTrustedEndpoint(
  input: LoadClassroomSubmissionsInput,
): Promise<ClassroomRepositoryOutcome<ActivitySubmission[]>> {
  const classCode = input.classCode.trim().toUpperCase();

  if (!input.idToken) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '교사 인증 토큰이 없어 서버 제출 목록을 불러올 수 없습니다. 다시 로그인해 주세요.',
      developerLogs: ['listSubmissions endpoint skipped: idToken is missing.'],
    };
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(
      input.endpoint ?? DEFAULT_LIST_SUBMISSIONS_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idToken: input.idToken,
          classCode,
        }),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | ListSubmissionsApiPayload
      | null;
    const submissions = normalizeActivitySubmissions(payload?.submissions);
    const studentMessage =
      typeof payload?.studentMessage === 'string'
        ? payload.studentMessage
        : '서버 제출 목록 응답을 읽지 못했습니다.';
    const developerMessage =
      typeof payload?.developerMessage === 'string'
        ? payload.developerMessage
        : `listSubmissions endpoint returned HTTP ${response.status}.`;

    return {
      ok: response.ok && payload?.ok === true,
      data: response.ok && payload?.ok === true ? submissions : [],
      studentMessage,
      developerLogs: [
        developerMessage,
        `listSubmissions endpoint status: ${response.status}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '서버 제출 목록 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.',
      developerLogs: [
        `listSubmissions endpoint fetch failed: ${getErrorMessage(error)}`,
      ],
    };
  }
}

function normalizeActivitySubmissions(value: unknown): ActivitySubmission[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isActivitySubmission);
}

function isActivitySubmission(value: unknown): value is ActivitySubmission {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ActivitySubmission>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.submittedAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    Boolean(candidate.snapshot) &&
    typeof candidate.snapshot === 'object' &&
    (candidate.status === 'submitted' ||
      candidate.status === 'feedback_draft' ||
      candidate.status === 'feedback_returned')
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
