import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createServerFeedbackDraft,
  handleCreateFeedbackDraftBody,
  parseCreateFeedbackDraftRequest,
} from '../../../api/create-feedback-draft';
import type { ActivitySubmission, TeacherFeedbackDraft } from '../../types/feedback';

const submission: ActivitySubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: '익명 학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    appMode: 'activity',
    userMode: 'student',
    activityTitle: '물 분자 구조 그리기',
    moleculeName: '물',
    studentPrediction: {
      predictedFormula: 'H2O',
      predictedMolecularWeight: '18',
      drawingReason: '산소와 수소가 결합한다고 생각했습니다.',
    },
    rdkitValidation: {
      isValid: true,
      molecularFormula: 'H2O',
      molecularWeight: 18.015,
    },
    threeDObservation: {
      has3DStructure: true,
      sourceLabel: '예제 내장 3D 구조',
    },
    measurements: [],
    activityAnswers: [],
    finalReflection: '굽은형 구조를 확인했습니다.',
    exportNotice: '수업 활동 기록용입니다.',
  },
  status: 'submitted',
};

const feedback: TeacherFeedbackDraft = {
  id: 'feedback-1',
  createdAt: '2026-07-02T01:00:00.000Z',
  updatedAt: '2026-07-02T01:00:00.000Z',
  source: 'local_guardrail_preview',
  summary: '물 활동 피드백 초안입니다.',
  strengths: ['구조 확인 결과를 근거로 비교했습니다.'],
  improvementQuestions: ['비공유 전자쌍의 영향을 설명해 보세요.'],
  studentMessage: '교사가 확인할 피드백 초안입니다.',
  teacherReviewNote: '교사 확인 필요',
  reviewRequired: true,
};
const serverSubmission = submission as unknown as Parameters<
  typeof createServerFeedbackDraft
>[0];

describe('create-feedback-draft API helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('normalizes and validates a trusted feedback draft request', () => {
    const result = parseCreateFeedbackDraftRequest({
      idToken: 'teacher-token',
      classCode: ' chem/101 ',
      submissionId: 'submission-1',
      snapshot: { unsafe: true },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
      },
    });
  });

  it('creates a draft only for an assigned teacher using server-loaded submission', async () => {
    const createDraft = vi.fn().mockResolvedValue({
      feedback,
      studentMessage: '서버에서 피드백 초안을 만들었습니다.',
      developerMessage: 'draft created',
    });
    const response = await handleCreateFeedbackDraftBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'teacher-uid',
          teacher: true,
        }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          ownerTeacherUid: 'teacher-uid',
          teacherUids: {
            'teacher-uid': true,
          },
        }),
        getSubmission: vi.fn().mockResolvedValue(submission),
        createDraft,
        now: () => '2026-07-02T01:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'created',
      classCode: 'CHEM-101',
      feedback: {
        id: 'feedback-1',
        studentMessage: '교사가 확인할 피드백 초안입니다.',
      },
    });
    expect(createDraft).toHaveBeenCalledWith(
      submission,
      '2026-07-02T01:00:00.000Z',
    );
  });

  it('rejects a teacher who is not assigned to the classroom', async () => {
    const createDraft = vi.fn();
    const response = await handleCreateFeedbackDraftBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'other-teacher',
          teacher: true,
        }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          ownerTeacherUid: 'teacher-uid',
          teacherUids: {
            'teacher-uid': true,
          },
        }),
        getSubmission: vi.fn().mockResolvedValue(submission),
        createDraft,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'unauthorized',
    });
    expect(createDraft).not.toHaveBeenCalled();
  });

  it('uses the local guardrail draft when no server AI provider is configured', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('OPENAI_API_KEY', '');

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );

    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain('OPENAI_API_KEY');
  });

  it('creates an AI draft through the OpenAI-compatible provider without exposing the key in the body', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    vi.stubEnv('OPENAI_MODEL', 'test-feedback-model');
    vi.stubEnv('OPENAI_BASE_URL', 'https://ai.example.test/v1');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: '물 분자 활동 피드백 초안입니다.',
                  strengths: ['검증 결과를 바탕으로 예측을 다시 보았습니다.'],
                  improvementQuestions: [
                    '참고 3D 구조와 입체 구조 예측의 차이를 어떻게 설명할 수 있나요?',
                  ],
                  studentMessage:
                    '구조 확인값을 기준으로 예측과 관찰을 다시 연결해 보세요.',
                  teacherReviewNote:
                    '교사가 과학 내용과 표현을 확인한 뒤 전달해야 합니다.',
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );
    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(String(requestInit.body)) as Record<
      string,
      unknown
    >;

    expect(fetchMock).toHaveBeenCalledWith(
      'https://ai.example.test/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(requestInit.headers).toMatchObject({
      authorization: 'Bearer test-openai-key',
      'content-type': 'application/json',
    });
    expect(JSON.stringify(requestBody)).not.toContain('test-openai-key');
    expect(requestBody).toMatchObject({
      model: 'test-feedback-model',
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
    });
    expect(result.feedback.source).toBe('ai_api');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.feedback.studentMessage).toContain('구조 확인값');
    expect(result.developerMessage).toContain('OpenAI-compatible feedback');
  });

  it('falls back to the local guardrail draft when the OpenAI-compatible provider fails', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('OPENAI_API_KEY', 'test-openai-key');
    vi.stubEnv('OPENAI_MODEL', 'test-feedback-model');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('bad gateway', {
          status: 502,
        }),
      ),
    );

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );

    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain('HTTP 502');
  });
});
