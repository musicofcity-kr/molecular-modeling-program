import type { ActivitySubmission } from '../../types/feedback';
import type { ClassroomRepositoryOutcome } from './classroomRepository';

type SaveSubmissionWithTrustedEndpointInput = {
  submission: ActivitySubmission;
  idToken?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

type SaveSubmissionApiPayload = {
  ok?: unknown;
  status?: unknown;
  classCode?: unknown;
  submission?: unknown;
  studentMessage?: unknown;
  developerMessage?: unknown;
};

const DEFAULT_SAVE_SUBMISSION_ENDPOINT = '/api/save-submission';

export async function saveSubmissionWithTrustedEndpoint(
  input: SaveSubmissionWithTrustedEndpointInput,
): Promise<ClassroomRepositoryOutcome<ActivitySubmission>> {
  if (!input.idToken) {
    return {
      ok: false,
      data: input.submission,
      studentMessage:
        '서버 제출 인증 정보가 없어 서버 제출함에 저장하지 못했습니다. 학생 화면에서 수업코드로 다시 입장한 뒤 제출해 주세요.',
      developerLogs: ['saveSubmission endpoint skipped: idToken is missing.'],
    };
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(
      input.endpoint ?? DEFAULT_SAVE_SUBMISSION_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idToken: input.idToken,
          submission: input.submission,
        }),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | SaveSubmissionApiPayload
      | null;
    const studentMessage =
      typeof payload?.studentMessage === 'string'
        ? payload.studentMessage
        : '서버 제출함 응답을 읽지 못했습니다.';
    const developerMessage =
      typeof payload?.developerMessage === 'string'
        ? payload.developerMessage
        : `saveSubmission endpoint returned HTTP ${response.status}.`;
    const savedSubmission = isActivitySubmission(payload?.submission)
      ? payload.submission
      : input.submission;

    return {
      ok: response.ok && payload?.ok === true,
      data: savedSubmission,
      studentMessage,
      developerLogs: [
        developerMessage,
        `saveSubmission endpoint status: ${response.status}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      data: input.submission,
      studentMessage:
        '서버 제출함 요청을 보내지 못했습니다. 현재 활동 결과는 브라우저 제출함에 보관됩니다.',
      developerLogs: [
        `saveSubmission endpoint fetch failed: ${getErrorMessage(error)}`,
      ],
    };
  }
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
    candidate.status === 'submitted'
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
