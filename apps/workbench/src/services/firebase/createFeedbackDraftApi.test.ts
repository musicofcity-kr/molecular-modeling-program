import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createServerFeedbackDraft,
  handleCreateFeedbackDraftBody,
  parseCreateFeedbackDraftRequest,
  redactExplicitStudentPii,
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
      structureIntent: 'single-molecule',
      graphSummary: {
        atomCount: 3,
        bondCount: 2,
        componentCount: 1,
        componentAtomCounts: [3],
        isSingleComponent: true,
        isolatedAtomCount: 0,
      },
      connectivityStatus: 'single-component',
      warnings: ['중성 전하 분리 구조는 교사 검토가 필요합니다.'],
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

function createServerSubmissionWithPii(): Parameters<
  typeof createServerFeedbackDraft
>[0] {
  return {
    ...submission,
    studentDisplayName: '민감학생',
    anonymousStudentId: 'student-private-id',
    snapshot: {
      ...submission.snapshot,
      studentPrediction: {
        ...submission.snapshot.studentPrediction,
        drawingReason:
          'student@example.com 대신 물의 O-H 결합을 근거로 설명했습니다.',
      },
      threeDObservation: {
        ...submission.snapshot.threeDObservation,
        studentObservation:
          '010-1234-5678 연락처와 무관하게 H-O-H 굽은형을 관찰했습니다.',
      },
      comparisonObservation: {
        available: true,
        observedSimilarities: '학번: 20261234 물은 극성 분자입니다.',
        observedDifferences:
          '주민등록번호형 010101-3123456과 무관하게 결합각을 비교했습니다.',
        studentReflection: '산소의 비공유 전자쌍을 다시 확인했습니다.',
      },
      activityAnswers: [
        {
          questionId: 'reflection',
          questionText: '구조의 근거를 설명해 보세요.',
          answer: '02-123-4567 대신 전자 영역을 근거로 답했습니다.',
        },
      ],
      finalReflection: '정상 화학 텍스트인 H2O와 104.5도를 유지합니다.',
    },
  } as unknown as Parameters<typeof createServerFeedbackDraft>[0];
}

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

  it('redacts explicit PII patterns while preserving chemistry text', () => {
    const input =
      [
        'student@example.com',
        '010-1234-5678',
        '010.2345.6789',
        '010 3456 7890',
        '+82 10 4567 8901',
        '070-1234-5678',
        '(070) 1234-5678',
        '+82 70 2345 6789',
        '+82 (0)31 3456 7890',
        '0082-2-1234-5678',
        '080-123-4567',
        '010101-3123456',
        '020202.4234567',
        '030303-5123456',
        '학번: 20261234',
        '학번=20261235',
        '학번은 20261236',
        '학생번호: 20261237',
        '물의 H2O 구조는 H-O-H이며 결합각은 104.5도이고 원자 수는 3개입니다.',
      ].join(' / ');
    const result = redactExplicitStudentPii(input);

    expect(result).not.toContain('student@example.com');
    expect(result).not.toContain('010-1234-5678');
    expect(result).not.toContain('010.2345.6789');
    expect(result).not.toContain('010 3456 7890');
    expect(result).not.toContain('+82 10 4567 8901');
    expect(result).not.toContain('070-1234-5678');
    expect(result).not.toContain('(070) 1234-5678');
    expect(result).not.toContain('+82 70 2345 6789');
    expect(result).not.toContain('+82 (0)31 3456 7890');
    expect(result).not.toContain('0082-2-1234-5678');
    expect(result).not.toContain('080-123-4567');
    expect(result).not.toContain('010101-3123456');
    expect(result).not.toContain('020202.4234567');
    expect(result).not.toContain('030303-5123456');
    expect(result).not.toContain('20261234');
    expect(result).not.toContain('20261235');
    expect(result).not.toContain('20261236');
    expect(result).not.toContain('20261237');
    expect(result.match(/\[개인정보 삭제\]/g)).toHaveLength(18);
    expect(result).toContain(
      '물의 H2O 구조는 H-O-H이며 결합각은 104.5도이고 원자 수는 3개입니다.',
    );
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
    vi.stubEnv('GEMINI_API_KEY', '');

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );

    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain('GEMINI_API_KEY');
  });

  it('uses only the server-side AI_FEEDBACK_ENDPOINT for an external draft', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', 'https://feedback.example.test/draft');
    vi.stubEnv(
      'VITE_AI_FEEDBACK_ENDPOINT',
      'https://legacy-browser.example.test/draft',
    );
    vi.stubEnv('GEMINI_API_KEY', '');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          summary: 'student@example.com 물 분자 피드백 초안입니다.',
          strengths: ['010-1234-5678 대신 구조 확인 결과를 근거로 설명했습니다.'],
          improvementQuestions: [
            '학번: 20261234 결합각의 근거는 무엇인가요?',
          ],
          studentMessage:
            '주민등록번호형 010101-3123456과 무관하게 근거와 관찰을 연결해 보세요.',
          teacherReviewNote:
            '02-123-4567 대신 교사가 과학 내용을 확인해야 합니다.',
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
    const piiSubmission = createServerSubmissionWithPii();
    const originalSubmission = JSON.stringify(piiSubmission);

    const result = await createServerFeedbackDraft(
      piiSubmission,
      '2026-07-02T01:00:00.000Z',
    );
    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBodyText = String(requestInit.body);
    const requestBody = JSON.parse(requestBodyText) as {
      submission: {
        validation: Record<string, unknown>;
      };
    };
    const resultText = JSON.stringify(result.feedback);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://feedback.example.test/draft',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      'https://legacy-browser.example.test/draft',
      expect.anything(),
    );
    expect(requestBodyText).not.toContain('student@example.com');
    expect(requestBodyText).not.toContain('010-1234-5678');
    expect(requestBodyText).not.toContain('010101-3123456');
    expect(requestBodyText).not.toContain('20261234');
    expect(requestBodyText).not.toContain('02-123-4567');
    expect(requestBodyText).not.toContain('민감학생');
    expect(requestBodyText).not.toContain('student-private-id');
    expect(requestBodyText).toContain('[개인정보 삭제]');
    expect(requestBodyText).toContain('물의 O-H 결합');
    expect(requestBodyText).toContain('H-O-H 굽은형');
    expect(requestBody.submission.validation).toMatchObject({
      structureIntent: 'single-molecule',
      connectivityStatus: 'single-component',
      graphSummary: {
        atomCount: 3,
        bondCount: 2,
        componentCount: 1,
      },
      warnings: ['중성 전하 분리 구조는 교사 검토가 필요합니다.'],
    });
    expect(resultText).not.toContain('student@example.com');
    expect(resultText).not.toContain('010-1234-5678');
    expect(resultText).not.toContain('010101-3123456');
    expect(resultText).not.toContain('20261234');
    expect(resultText).not.toContain('02-123-4567');
    expect(resultText).toContain('[개인정보 삭제]');
    expect(resultText).toContain('물 분자');
    expect(JSON.stringify(piiSubmission)).toBe(originalSubmission);
    expect(originalSubmission).toContain('student@example.com');
    expect(result.feedback.source).toBe('ai_api');
    expect(result.feedback.reviewRequired).toBe(true);
  });

  it('deeply redacts adversarial provider keys and numeric phone values without mutating the submission', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', 'https://feedback.example.test/draft');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          summary:
            '010.2345.6789, +82 (0)31 3456 7890 및 외국인등록번호형 040404-6123456이 포함된 응답입니다.',
          strengths: ['+82 10 4567 8901 대신 구조 근거를 사용했습니다.'],
          improvementQuestions: ['학번=20261235 결합각의 근거는 무엇인가요?'],
          studentMessage:
            'H2O 구조는 H-O-H이고 결합각은 104.5도이며 원자 수는 3개입니다.',
          teacherReviewNote:
            '+82 70 3456 7890 및 학생번호: 20261237 대신 교사가 반드시 검토해야 합니다.',
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
    const adversarialSubmission = {
      ...submission,
      snapshot: {
        ...submission.snapshot,
        studentPrediction: {
          ...submission.snapshot.studentPrediction,
          'student-key@example.com': '010.1234.5678',
          nested: {
            numericPhone: 1012345678,
            numericVoipPhone: 7012345678,
            numericCountryPhone: 8201012345678,
            voipPhone: '070-1234-5678',
            foreignRegistration: '030303-5123456',
            studentNumber: '학번=20261234',
            studentNumberNatural: '학번은 20261236',
            studentNumberLabel: '학생번호: 20261237',
          },
          chemistryText:
            'H2O 구조는 H-O-H이고 결합각은 104.5도이며 원자 수는 3개입니다.',
          bondAngle: 104.5,
          atomCount: 3,
        },
      },
    } as unknown as Parameters<typeof createServerFeedbackDraft>[0];
    const originalSubmission = JSON.stringify(adversarialSubmission);

    const result = await createServerFeedbackDraft(
      adversarialSubmission,
      '2026-07-02T01:00:00.000Z',
    );
    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBodyText = String(requestInit.body);
    const requestBody = JSON.parse(requestBodyText) as {
      submission: {
        prediction: {
          [key: string]: unknown;
          chemistryText: string;
          bondAngle: number;
          atomCount: number;
          nested: {
            numericPhone: unknown;
            numericVoipPhone: unknown;
            numericCountryPhone: unknown;
            voipPhone: unknown;
            foreignRegistration: unknown;
            studentNumber: unknown;
            studentNumberNatural: unknown;
            studentNumberLabel: unknown;
          };
        };
      };
    };
    const feedbackText = JSON.stringify(result.feedback);

    expect(requestBodyText).not.toContain('student-key@example.com');
    expect(requestBodyText).not.toContain('010.1234.5678');
    expect(requestBodyText).not.toContain('1012345678');
    expect(requestBodyText).not.toContain('7012345678');
    expect(requestBodyText).not.toContain('8201012345678');
    expect(requestBodyText).not.toContain('070-1234-5678');
    expect(requestBodyText).not.toContain('030303-5123456');
    expect(requestBodyText).not.toContain('학번=20261234');
    expect(requestBodyText).not.toContain('학번은 20261236');
    expect(requestBodyText).not.toContain('학생번호: 20261237');
    expect(requestBodyText).toContain('[개인정보 삭제]');
    expect(requestBody.submission.prediction['[개인정보 삭제]']).toBe(
      '[개인정보 삭제]',
    );
    expect(requestBody.submission.prediction.nested).toEqual({
      numericPhone: '[개인정보 삭제]',
      numericVoipPhone: '[개인정보 삭제]',
      numericCountryPhone: '[개인정보 삭제]',
      voipPhone: '[개인정보 삭제]',
      foreignRegistration: '[개인정보 삭제]',
      studentNumber: '[개인정보 삭제]',
      studentNumberNatural: '[개인정보 삭제]',
      studentNumberLabel: '[개인정보 삭제]',
    });
    expect(requestBody.submission.prediction).toMatchObject({
      chemistryText:
        'H2O 구조는 H-O-H이고 결합각은 104.5도이며 원자 수는 3개입니다.',
      bondAngle: 104.5,
      atomCount: 3,
    });
    expect(feedbackText).not.toContain('010.2345.6789');
    expect(feedbackText).not.toContain('+82 (0)31 3456 7890');
    expect(feedbackText).not.toContain('040404-6123456');
    expect(feedbackText).not.toContain('+82 10 4567 8901');
    expect(feedbackText).not.toContain('+82 70 3456 7890');
    expect(feedbackText).not.toContain('학번=20261235');
    expect(feedbackText).not.toContain('학생번호: 20261237');
    expect(result.feedback.summary).toContain('[개인정보 삭제]');
    expect(result.feedback.strengths[0]).toContain('[개인정보 삭제]');
    expect(result.feedback.improvementQuestions[0]).toContain(
      '[개인정보 삭제]',
    );
    expect(result.feedback.studentMessage).toContain('H2O');
    expect(result.feedback.studentMessage).toContain('H-O-H');
    expect(result.feedback.studentMessage).toContain('104.5도');
    expect(result.feedback.studentMessage).toContain('원자 수는 3개');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(JSON.stringify(adversarialSubmission)).toBe(originalSubmission);
  });

  it('does not return malformed external provider bodies or parser messages', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', 'https://feedback.example.test/draft');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    const rawProviderBody =
      'RAW-EXTERNAL 학번=20261234 student@example.com 070-1234-5678';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(rawProviderBody, {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      ),
    );

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );
    const resultText = JSON.stringify(result);

    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain('invalid JSON');
    expect(resultText).not.toContain('RAW-EXTERNAL');
    expect(resultText).not.toContain('20261234');
    expect(resultText).not.toContain('student@example.com');
    expect(resultText).not.toContain('070-1234-5678');
  });

  it('does not return non-OK external provider response bodies', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', 'https://feedback.example.test/draft');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('GEMINI_API_KEY', '');
    const rawProviderBody =
      'RAW-NON-OK 학번은 20261236 student@example.com +82 70 2345 6789';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(rawProviderBody, {
          status: 502,
        }),
      ),
    );

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );
    const resultText = JSON.stringify(result);

    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain('HTTP 502');
    expect(resultText).not.toContain('RAW-NON-OK');
    expect(resultText).not.toContain('20261236');
    expect(resultText).not.toContain('student@example.com');
    expect(resultText).not.toContain('+82 70 2345 6789');
  });

  it('ignores a legacy VITE endpoint and keeps the local guardrail policy', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv(
      'VITE_AI_FEEDBACK_ENDPOINT',
      'https://legacy-browser.example.test/draft',
    );
    vi.stubEnv('GEMINI_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain(
      'AI_FEEDBACK_ENDPOINT are not configured',
    );
  });

  it('creates an AI draft through Gemini without exposing the key in the body', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('GEMINI_MODEL', 'test-feedback-model');
    vi.stubEnv('GEMINI_BASE_URL', 'https://gemini.example.test/v1beta');

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary:
                        'student@example.com 물 분자 활동 피드백 초안입니다.',
                      strengths: [
                        '010-1234-5678 대신 검증 결과를 바탕으로 예측을 다시 보았습니다.',
                      ],
                      improvementQuestions: [
                        '학번: 20261234 참고 3D 구조와 입체 구조 예측의 차이를 어떻게 설명할 수 있나요?',
                      ],
                      studentMessage:
                        '주민등록번호형 010101-3123456과 무관하게 구조 확인값을 기준으로 예측과 관찰을 다시 연결해 보세요.',
                      teacherReviewNote:
                        '02-123-4567 대신 교사가 과학 내용과 표현을 확인한 뒤 전달해야 합니다.',
                    }),
                  },
                ],
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
      createServerSubmissionWithPii(),
      '2026-07-02T01:00:00.000Z',
    );
    const [, requestInit] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(String(requestInit.body)) as Record<
      string,
      unknown
    >;

    expect(fetchMock).toHaveBeenCalledWith(
      'https://gemini.example.test/v1beta/models/test-feedback-model:generateContent?key=test-gemini-key',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(requestInit.headers).toMatchObject({
      'content-type': 'application/json',
    });
    expect(JSON.stringify(requestBody)).not.toContain('test-gemini-key');
    expect(JSON.stringify(requestBody)).not.toContain('student@example.com');
    expect(JSON.stringify(requestBody)).not.toContain('010-1234-5678');
    expect(JSON.stringify(requestBody)).not.toContain('010101-3123456');
    expect(JSON.stringify(requestBody)).not.toContain('20261234');
    expect(JSON.stringify(requestBody)).not.toContain('02-123-4567');
    expect(JSON.stringify(requestBody)).not.toContain('민감학생');
    expect(JSON.stringify(requestBody)).not.toContain('student-private-id');
    expect(JSON.stringify(requestBody)).toContain('[개인정보 삭제]');
    expect(JSON.stringify(requestBody)).toContain('물의 O-H 결합');
    expect(JSON.stringify(requestBody)).toContain('H-O-H 굽은형');
    expect(requestBody).toMatchObject({
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });
    expect(requestBody).toHaveProperty('system_instruction');
    expect(requestBody).toHaveProperty('contents');
    expect(result.feedback.source).toBe('ai_api');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.feedback.studentMessage).toContain('구조 확인값');
    expect(JSON.stringify(result.feedback)).not.toContain('student@example.com');
    expect(JSON.stringify(result.feedback)).not.toContain('010-1234-5678');
    expect(JSON.stringify(result.feedback)).not.toContain('010101-3123456');
    expect(JSON.stringify(result.feedback)).not.toContain('20261234');
    expect(JSON.stringify(result.feedback)).not.toContain('02-123-4567');
    expect(JSON.stringify(result.feedback)).toContain('[개인정보 삭제]');
    expect(JSON.stringify(result.feedback)).toContain('물 분자');
    expect(result.developerMessage).toContain('Gemini feedback');
  });

  it('falls back to the local guardrail draft when Gemini fails', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('GEMINI_MODEL', 'test-feedback-model');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          'RAW-GEMINI-NON-OK 학생번호: 20261237 student@example.com 080-123-4567',
          {
          status: 502,
          },
        ),
      ),
    );

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );

    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain('HTTP 502');
    expect(JSON.stringify(result)).not.toContain('RAW-GEMINI-NON-OK');
    expect(JSON.stringify(result)).not.toContain('20261237');
    expect(JSON.stringify(result)).not.toContain('student@example.com');
    expect(JSON.stringify(result)).not.toContain('080-123-4567');
  });

  it('does not return malformed Gemini response bodies or parser messages', async () => {
    vi.stubEnv('AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('VITE_AI_FEEDBACK_ENDPOINT', '');
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('GEMINI_MODEL', 'test-feedback-model');
    const rawProviderBody =
      'RAW-GEMINI-JSON 학번=20261234 student@example.com +82 10 4567 8901';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(rawProviderBody, {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      ),
    );

    const result = await createServerFeedbackDraft(
      serverSubmission,
      '2026-07-02T01:00:00.000Z',
    );
    const resultText = JSON.stringify(result);

    expect(result.feedback.source).toBe('local_guardrail_preview');
    expect(result.feedback.reviewRequired).toBe(true);
    expect(result.developerMessage).toContain('invalid JSON');
    expect(resultText).not.toContain('RAW-GEMINI-JSON');
    expect(resultText).not.toContain('20261234');
    expect(resultText).not.toContain('student@example.com');
    expect(resultText).not.toContain('+82 10 4567 8901');
    expect(resultText).not.toContain('test-gemini-key');
  });
});
