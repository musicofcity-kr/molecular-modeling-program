import type { ActivitySubmission } from '../types/feedback';
import type { AiFeedbackDraftResult } from '../types/feedback';
import {
  buildFeedbackRequestPayload,
  buildLocalGuardrailFeedback,
  parseExternalFeedback,
  type ExternalFeedbackResponse,
} from './feedbackDraftCore';

type FeedbackFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type CreateFeedbackOptions = {
  endpoint?: string;
  fetcher?: FeedbackFetcher;
  now?: string;
};

export async function createTeacherFeedbackDraft(
  submission: ActivitySubmission,
  options: CreateFeedbackOptions = {},
): Promise<AiFeedbackDraftResult> {
  const endpoint = options.endpoint ?? getDefaultFeedbackEndpoint();
  const now = options.now ?? new Date().toISOString();

  if (!endpoint) {
    return {
      ok: true,
      status: 'success',
      feedback: buildLocalGuardrailFeedback(submission, now),
      studentMessage:
        'AI API 엔드포인트가 아직 연결되지 않아 교사용 로컬 검토 초안을 만들었습니다.',
      developerLogs: [
        'VITE_AI_FEEDBACK_ENDPOINT is not configured.',
        'Generated local guardrail feedback preview instead of calling an AI API.',
      ],
    };
  }

  const fetcher = options.fetcher ?? fetch;
  const payload = buildFeedbackRequestPayload(submission);

  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const responseText = await safeReadResponseText(response);

      return {
        ok: false,
        status: 'error',
        studentMessage:
          'AI 피드백 서버에서 초안을 만들지 못했습니다. 교사가 직접 피드백을 작성할 수 있습니다.',
        developerLogs: [
          'AI feedback endpoint returned non-OK response.',
          `HTTP status: ${response.status}`,
          `response: ${responseText.slice(0, 500)}`,
        ],
      };
    }

    const data = (await response.json()) as ExternalFeedbackResponse;

    return {
      ok: true,
      status: 'success',
      feedback: parseExternalFeedback(data, now),
      studentMessage:
        'AI 피드백 초안을 만들었습니다. 교사가 확인한 뒤 학생에게 전달할 수 있습니다.',
      developerLogs: ['AI feedback endpoint completed successfully.'],
    };
  } catch (error) {
    return {
      ok: false,
      status: 'error',
      studentMessage:
        'AI 피드백 서버에 연결하지 못했습니다. 네트워크 또는 서버 설정을 확인해 주세요.',
      developerLogs: [`AI feedback fetch failed: ${getErrorMessage(error)}`],
    };
  }
}

async function safeReadResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function getDefaultFeedbackEndpoint(): string {
  return import.meta.env.VITE_AI_FEEDBACK_ENDPOINT?.trim() ?? '';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
