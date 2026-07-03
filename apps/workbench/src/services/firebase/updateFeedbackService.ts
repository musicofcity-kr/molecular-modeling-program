import type { ActivitySubmission, TeacherFeedbackDraft } from '../../types/feedback';
import type { ClassroomRepositoryOutcome } from './classroomRepository';

type UpdateFeedbackWithTrustedEndpointInput = {
  submission: ActivitySubmission;
  feedback: TeacherFeedbackDraft;
  status: Extract<ActivitySubmission['status'], 'feedback_draft' | 'feedback_returned'>;
  idToken?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

type UpdateFeedbackApiPayload = {
  ok?: unknown;
  status?: unknown;
  classCode?: unknown;
  submission?: unknown;
  studentMessage?: unknown;
  developerMessage?: unknown;
};

const DEFAULT_UPDATE_FEEDBACK_ENDPOINT = '/api/update-feedback';

export async function updateFeedbackWithTrustedEndpoint(
  input: UpdateFeedbackWithTrustedEndpointInput,
): Promise<ClassroomRepositoryOutcome<ActivitySubmission>> {
  const classCode = input.submission.classCode?.trim().toUpperCase() ?? '';

  if (!input.idToken) {
    return {
      ok: false,
      data: input.submission,
      studentMessage:
        '교사 인증 토큰이 없어 서버 피드백을 저장할 수 없습니다. 다시 로그인해 주세요.',
      developerLogs: ['updateFeedback endpoint skipped: idToken is missing.'],
    };
  }

  if (!classCode) {
    return {
      ok: false,
      data: input.submission,
      studentMessage: '수업코드가 없어 서버 피드백을 저장하지 못했습니다.',
      developerLogs: ['updateFeedback endpoint skipped: classCode is missing.'],
    };
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(
      input.endpoint ?? DEFAULT_UPDATE_FEEDBACK_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idToken: input.idToken,
          classCode,
          submissionId: input.submission.id,
          feedback: input.feedback,
          status: input.status,
        }),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | UpdateFeedbackApiPayload
      | null;
    const studentMessage =
      typeof payload?.studentMessage === 'string'
        ? payload.studentMessage
        : '서버 피드백 저장 응답을 읽지 못했습니다.';
    const developerMessage =
      typeof payload?.developerMessage === 'string'
        ? payload.developerMessage
        : `updateFeedback endpoint returned HTTP ${response.status}.`;
    const updatedSubmission = isActivitySubmission(payload?.submission)
      ? payload.submission
      : input.submission;

    return {
      ok: response.ok && payload?.ok === true,
      data: updatedSubmission,
      studentMessage,
      developerLogs: [
        developerMessage,
        `updateFeedback endpoint status: ${response.status}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      data: input.submission,
      studentMessage:
        '서버 피드백 저장 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.',
      developerLogs: [
        `updateFeedback endpoint fetch failed: ${getErrorMessage(error)}`,
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
    (candidate.status === 'submitted' ||
      candidate.status === 'feedback_draft' ||
      candidate.status === 'feedback_returned')
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
