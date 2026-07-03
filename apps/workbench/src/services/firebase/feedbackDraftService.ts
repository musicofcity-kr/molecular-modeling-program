import type {
  ActivitySubmission,
  AiFeedbackDraftResult,
  TeacherFeedbackDraft,
} from '../../types/feedback';

type CreateFeedbackDraftWithTrustedEndpointInput = {
  submission: ActivitySubmission;
  idToken?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

type CreateFeedbackDraftApiPayload = {
  ok?: unknown;
  status?: unknown;
  classCode?: unknown;
  feedback?: unknown;
  studentMessage?: unknown;
  developerMessage?: unknown;
};

const DEFAULT_CREATE_FEEDBACK_DRAFT_ENDPOINT = '/api/create-feedback-draft';

export async function createFeedbackDraftWithTrustedEndpoint(
  input: CreateFeedbackDraftWithTrustedEndpointInput,
): Promise<AiFeedbackDraftResult> {
  const classCode = input.submission.classCode?.trim().toUpperCase() ?? '';

  if (!input.idToken) {
    return {
      ok: false,
      status: 'error',
      studentMessage:
        '교사 인증 토큰이 없어 서버에서 피드백 초안을 만들 수 없습니다. 다시 로그인해 주세요.',
      developerLogs: ['createFeedbackDraft endpoint skipped: idToken is missing.'],
    };
  }

  if (!classCode) {
    return {
      ok: false,
      status: 'error',
      studentMessage: '수업코드가 없어 서버에서 피드백 초안을 만들 수 없습니다.',
      developerLogs: [
        'createFeedbackDraft endpoint skipped: classCode is missing.',
      ],
    };
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(
      input.endpoint ?? DEFAULT_CREATE_FEEDBACK_DRAFT_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          idToken: input.idToken,
          classCode,
          submissionId: input.submission.id,
        }),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | CreateFeedbackDraftApiPayload
      | null;
    const studentMessage =
      typeof payload?.studentMessage === 'string'
        ? payload.studentMessage
        : '서버 피드백 초안 응답을 읽지 못했습니다.';
    const developerMessage =
      typeof payload?.developerMessage === 'string'
        ? payload.developerMessage
        : `createFeedbackDraft endpoint returned HTTP ${response.status}.`;

    if (!response.ok || payload?.ok !== true || !isTeacherFeedbackDraft(payload.feedback)) {
      return {
        ok: false,
        status: 'error',
        studentMessage,
        developerLogs: [
          developerMessage,
          `createFeedbackDraft endpoint status: ${response.status}`,
        ],
      };
    }

    return {
      ok: true,
      status: 'success',
      feedback: payload.feedback,
      studentMessage,
      developerLogs: [
        developerMessage,
        `createFeedbackDraft endpoint status: ${response.status}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      studentMessage:
        '서버 피드백 초안 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.',
      developerLogs: [
        `createFeedbackDraft endpoint fetch failed: ${getErrorMessage(error)}`,
      ],
    };
  }
}

function isTeacherFeedbackDraft(value: unknown): value is TeacherFeedbackDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<TeacherFeedbackDraft>;

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    (candidate.source === 'ai_api' ||
      candidate.source === 'local_guardrail_preview') &&
    typeof candidate.summary === 'string' &&
    Array.isArray(candidate.strengths) &&
    Array.isArray(candidate.improvementQuestions) &&
    typeof candidate.studentMessage === 'string' &&
    typeof candidate.teacherReviewNote === 'string' &&
    typeof candidate.reviewRequired === 'boolean'
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
