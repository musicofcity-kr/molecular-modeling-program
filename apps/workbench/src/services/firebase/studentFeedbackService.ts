import type { ActivitySubmission } from '../../types/feedback';
import type { ClassroomRepositoryOutcome } from './classroomRepository';

type LoadStudentFeedbackInput = {
  classCode: string;
  idToken?: string;
  endpoint?: string;
  fetchImpl?: typeof fetch;
};

type ListStudentFeedbackPayload = {
  ok?: unknown;
  status?: unknown;
  classCode?: unknown;
  submissions?: unknown;
  studentMessage?: unknown;
  developerMessage?: unknown;
};

const DEFAULT_LIST_STUDENT_FEEDBACK_ENDPOINT = '/api/list-student-feedback';

export async function loadStudentFeedbackWithTrustedEndpoint(
  input: LoadStudentFeedbackInput,
): Promise<ClassroomRepositoryOutcome<ActivitySubmission[]>> {
  const classCode = input.classCode.trim().toUpperCase();

  if (!input.idToken) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '학생 인증 토큰이 없어 교사 피드백을 불러올 수 없습니다. 수업코드로 다시 입장해 주세요.',
      developerLogs: ['listStudentFeedback endpoint skipped: idToken is missing.'],
    };
  }

  if (!classCode) {
    return {
      ok: false,
      data: [],
      studentMessage: '수업코드가 없어 교사 피드백을 불러올 수 없습니다.',
      developerLogs: ['listStudentFeedback endpoint skipped: classCode is missing.'],
    };
  }

  const fetcher = input.fetchImpl ?? fetch;

  try {
    const response = await fetcher(
      input.endpoint ?? DEFAULT_LIST_STUDENT_FEEDBACK_ENDPOINT,
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
      | ListStudentFeedbackPayload
      | null;
    const submissions = normalizeActivitySubmissions(payload?.submissions);
    const studentMessage =
      typeof payload?.studentMessage === 'string'
        ? payload.studentMessage
        : '교사 피드백 조회 응답을 읽지 못했습니다.';
    const developerMessage =
      typeof payload?.developerMessage === 'string'
        ? payload.developerMessage
        : `listStudentFeedback endpoint returned HTTP ${response.status}.`;

    return {
      ok: response.ok && payload?.ok === true,
      data: response.ok && payload?.ok === true ? submissions : [],
      studentMessage,
      developerLogs: [
        developerMessage,
        `listStudentFeedback endpoint status: ${response.status}`,
      ],
    };
  } catch (error) {
    return {
      ok: false,
      data: [],
      studentMessage:
        '교사 피드백 조회 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.',
      developerLogs: [
        `listStudentFeedback endpoint fetch failed: ${getErrorMessage(error)}`,
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
    candidate.status === 'feedback_returned'
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
