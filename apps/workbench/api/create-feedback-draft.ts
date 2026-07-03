import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type CreateFeedbackDraftApiStatus =
  | 'created'
  | 'invalid_request'
  | 'server_not_configured'
  | 'unauthorized'
  | 'classroom_not_found'
  | 'submission_not_found'
  | 'server_error';

type CreateFeedbackDraftRequest = {
  idToken: string;
  classCode: string;
  submissionId: string;
};

type TeacherFeedbackDraft = {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: 'ai_api' | 'local_guardrail_preview';
  summary: string;
  strengths: string[];
  improvementQuestions: string[];
  studentMessage: string;
  teacherReviewNote: string;
  reviewRequired: boolean;
};

type ExternalFeedbackResponse = {
  summary?: unknown;
  strengths?: unknown;
  improvementQuestions?: unknown;
  studentMessage?: unknown;
  teacherReviewNote?: unknown;
};

type ActivitySubmission = {
  id: string;
  submittedAt: string;
  updatedAt: string;
  classCode?: string;
  studentDisplayName?: string;
  anonymousStudentId?: string;
  snapshot: Record<string, unknown>;
  status: 'submitted' | 'feedback_draft' | 'feedback_returned';
  teacherFeedback?: Record<string, unknown>;
  feedbackReturnedAt?: string;
};

type CreateFeedbackDraftApiPayload = {
  ok: boolean;
  status: CreateFeedbackDraftApiStatus;
  classCode?: string;
  feedback?: TeacherFeedbackDraft;
  studentMessage: string;
  developerMessage: string;
};

type VerifiedTeacherToken = {
  uid: string;
  teacher?: unknown;
  role?: unknown;
};

type ClassroomTeacherAccessRecord = {
  exists: boolean;
  ownerTeacherUid?: unknown;
  teacherUids?: unknown;
};

type AdminCredentialConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type CreateFeedbackDraftDependencies = {
  verifyIdToken: (idToken: string) => Promise<VerifiedTeacherToken>;
  getClassroom: (classCode: string) => Promise<ClassroomTeacherAccessRecord>;
  getSubmission: (
    classCode: string,
    submissionId: string,
  ) => Promise<ActivitySubmission | null>;
  createDraft: (
    submission: ActivitySubmission,
    now: string,
  ) => Promise<{
    feedback: TeacherFeedbackDraft;
    studentMessage: string;
    developerMessage: string;
  }>;
  now?: () => string;
};

const jsonHeaders = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

const corsHeaders = {
  ...jsonHeaders,
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const SERVER_NOT_CONFIGURED_MESSAGE =
  '서버 피드백 초안 생성 설정이 아직 준비되지 않았습니다. 교사용 로컬 피드백은 계속 유지됩니다.';

export default {
  async fetch(request: Request): Promise<Response> {
    return createFeedbackDraftFetch(request);
  },
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<Response> {
  return createFeedbackDraftFetch(request);
}

export async function createFeedbackDraftFetch(
  request: Request,
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return OPTIONS();
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: '피드백 초안 생성 요청 방식이 올바르지 않습니다.',
        developerMessage: `createFeedbackDraft rejected method: ${request.method}`,
      },
      405,
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: '피드백 초안 생성 요청을 읽지 못했습니다.',
        developerMessage: 'createFeedbackDraft request body is not valid JSON.',
      },
      400,
    );
  }

  try {
    return handleCreateFeedbackDraftBody(
      body,
      createFirebaseAdminDependencies(),
    );
  } catch (error) {
    console.error('[create-feedback-draft] admin setup failed', {
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_not_configured',
        studentMessage: SERVER_NOT_CONFIGURED_MESSAGE,
        developerMessage: `createFeedbackDraft admin setup failed: ${getErrorMessage(error)}`,
      },
      503,
    );
  }
}

export async function handleCreateFeedbackDraftBody(
  body: unknown,
  dependencies: CreateFeedbackDraftDependencies,
): Promise<Response> {
  const parsed = parseCreateFeedbackDraftRequest(body);

  if (!parsed.ok) {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: parsed.studentMessage,
        developerMessage: parsed.developerMessage,
      },
      400,
    );
  }

  const request = parsed.data;
  const now = dependencies.now?.() ?? new Date().toISOString();

  try {
    const decodedToken = await dependencies.verifyIdToken(request.idToken);

    if (!isTeacherClaimAccepted(decodedToken)) {
      return jsonResponse(
        {
          ok: false,
          status: 'unauthorized',
          classCode: request.classCode,
          studentMessage:
            '교사 권한이 확인된 계정만 피드백 초안을 만들 수 있습니다.',
          developerMessage: `createFeedbackDraft rejected teacher claim: uid=${decodedToken.uid || 'missing'}`,
        },
        403,
      );
    }

    const classroom = await dependencies.getClassroom(request.classCode);

    if (!classroom.exists) {
      return jsonResponse(
        {
          ok: false,
          status: 'classroom_not_found',
          classCode: request.classCode,
          studentMessage: '해당 수업코드의 서버 수업방을 찾지 못했습니다.',
          developerMessage: `createFeedbackDraft classroom not found: ${request.classCode}`,
        },
        404,
      );
    }

    if (!isAssignedTeacher(classroom, decodedToken.uid)) {
      return jsonResponse(
        {
          ok: false,
          status: 'unauthorized',
          classCode: request.classCode,
          studentMessage:
            '이 수업방 피드백 초안을 만들 교사 권한을 확인하지 못했습니다.',
          developerMessage: `createFeedbackDraft rejected classroom teacher access: classCode=${request.classCode}, uid=${decodedToken.uid}`,
        },
        403,
      );
    }

    const submission = await dependencies.getSubmission(
      request.classCode,
      request.submissionId,
    );

    if (!submission) {
      return jsonResponse(
        {
          ok: false,
          status: 'submission_not_found',
          classCode: request.classCode,
          studentMessage: '피드백 초안을 만들 제출 자료를 찾지 못했습니다.',
          developerMessage: `createFeedbackDraft submission not found: classCode=${request.classCode}, submission=${request.submissionId}`,
        },
        404,
      );
    }

    const draft = await dependencies.createDraft(submission, now);

    return jsonResponse(
      {
        ok: true,
        status: 'created',
        classCode: request.classCode,
        feedback: draft.feedback,
        studentMessage: draft.studentMessage,
        developerMessage: draft.developerMessage,
      },
      200,
    );
  } catch (error) {
    console.error('[create-feedback-draft] request failed', {
      classCode: request.classCode,
      submissionId: request.submissionId,
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_error',
        classCode: request.classCode,
        studentMessage:
          '피드백 초안 생성 중 문제가 발생했습니다. 교사 권한과 수업코드를 확인해 주세요.',
        developerMessage: `createFeedbackDraft failed: ${getErrorMessage(error)}`,
      },
      500,
    );
  }
}

export function parseCreateFeedbackDraftRequest(
  body: unknown,
):
  | { ok: true; data: CreateFeedbackDraftRequest }
  | { ok: false; studentMessage: string; developerMessage: string } {
  if (!body || typeof body !== 'object') {
    return invalidRequest('request body is not an object');
  }

  const candidate = body as Record<string, unknown>;
  const idToken = sanitizeString(candidate.idToken, 8192);
  const classCode = normalizeJoinClassCode(candidate.classCode);
  const submissionId = sanitizeString(candidate.submissionId, 120);

  if (!idToken) {
    return invalidRequest('idToken is missing');
  }

  if (!classCode) {
    return invalidRequest('classCode is missing');
  }

  if (!submissionId) {
    return invalidRequest('submissionId is missing');
  }

  return {
    ok: true,
    data: {
      idToken,
      classCode,
      submissionId,
    },
  };
}

function buildFeedbackRequestPayload(submission: ActivitySubmission) {
  const snapshot = submission.snapshot;

  return {
    guardrails: {
      language: 'ko-KR',
      audience: 'high_school_chemistry_student',
      noAutoGrade: true,
      teacherReviewRequired: true,
      avoidPersonalData: true,
      avoidPersonalityJudgment: true,
      avoidUnverifiedChemistryClaims: true,
      focus:
        '분자 구조 확인 결과, 3D 구조 관찰, VSEPR 예측의 출처와 한계를 구분하도록 돕는 형성 피드백',
    },
    submission: {
      id: submission.id,
      activityTitle: snapshot.activityTitle,
      moleculeName: snapshot.moleculeName,
      prediction: snapshot.studentPrediction,
      validation: snapshot.rdkitValidation,
      threeDObservation: snapshot.threeDObservation,
      vseprResult: snapshot.vseprResult,
      comparisonObservation: snapshot.comparisonObservation,
      answers: snapshot.activityAnswers,
      finalReflection: snapshot.finalReflection,
    },
    requiredResponseShape: {
      summary: 'string',
      strengths: ['string'],
      improvementQuestions: ['string'],
      studentMessage: 'string',
      teacherReviewNote: 'string',
    },
  };
}

function buildLocalGuardrailFeedback(
  submission: ActivitySubmission,
  now: string,
): TeacherFeedbackDraft {
  const snapshot = submission.snapshot;
  const moleculeName =
    typeof snapshot.moleculeName === 'string' ? snapshot.moleculeName : '분자';
  const rdkitValidation =
    snapshot.rdkitValidation &&
    typeof snapshot.rdkitValidation === 'object' &&
    !Array.isArray(snapshot.rdkitValidation)
      ? (snapshot.rdkitValidation as Record<string, unknown>)
      : {};
  const studentPrediction =
    snapshot.studentPrediction &&
    typeof snapshot.studentPrediction === 'object' &&
    !Array.isArray(snapshot.studentPrediction)
      ? (snapshot.studentPrediction as Record<string, unknown>)
      : {};
  const comparisonObservation =
    snapshot.comparisonObservation &&
    typeof snapshot.comparisonObservation === 'object' &&
    !Array.isArray(snapshot.comparisonObservation)
      ? (snapshot.comparisonObservation as Record<string, unknown>)
      : {};
  const molecularFormula =
    typeof rdkitValidation.molecularFormula === 'string'
      ? rdkitValidation.molecularFormula
      : '분자식 미표시';
  const validationText =
    rdkitValidation.isValid === true
      ? `구조 확인값 ${molecularFormula}을 기준으로 예측을 비교했습니다.`
      : '아직 구조 확인이 완료되지 않아 분자식과 평균 분자량 판단은 보류해야 합니다.';
  const hasComparison =
    isFilledString(comparisonObservation.observedSimilarities) ||
    isFilledString(comparisonObservation.observedDifferences);
  const hasPrediction =
    isFilledString(studentPrediction.predictedFormula) ||
    isFilledString(studentPrediction.drawingReason);
  const strengths = [
    hasPrediction
      ? '분자 구조를 그리기 전에 자신의 예측을 먼저 남겼습니다.'
      : '다음 활동에서는 구조를 확인하기 전에 예측을 먼저 적으면 좋습니다.',
    validationText,
    hasComparison
      ? '참고 3D 구조와 입체 구조 예상을 비교하려고 시도했습니다.'
      : '다음 단계에서는 참고 3D 구조와 입체 구조 예상의 차이를 한 문장으로 비교해 보세요.',
  ];
  const improvementQuestions = [
    `${moleculeName}의 분자식 예측과 구조 확인 결과가 다르다면, 어떤 원자나 결합을 다시 확인해야 할까요?`,
    '3D 구조 자료와 입체 구조 예상 모형은 각각 어떤 출처와 한계를 가지고 있나요?',
    '이번 활동에서 처음 생각한 내용과 구조 확인 뒤 바뀐 생각을 한 문장으로 비교해 보세요.',
  ];
  const studentMessage = [
    `${moleculeName} 활동 피드백입니다.`,
    ...strengths.map((item) => `- ${item}`),
    '다음 질문을 바탕으로 한 번 더 정리해 보세요.',
    ...improvementQuestions.map((item) => `- ${item}`),
    '이 피드백은 교사가 확인한 뒤 전달되는 형성 피드백이며 점수나 등급이 아닙니다.',
  ].join('\n');

  return {
    id: createFeedbackId(now),
    createdAt: now,
    updatedAt: now,
    source: 'local_guardrail_preview',
    summary: `${moleculeName} 활동에 대한 교사용 형성 피드백 초안입니다.`,
    strengths,
    improvementQuestions,
    studentMessage,
    teacherReviewNote:
      'AI API가 연결되지 않아 로컬 규칙 기반 초안을 만들었습니다. 학생에게 전달하기 전에 교사가 문구와 과학 내용을 확인해야 합니다.',
    reviewRequired: true,
  };
}

function parseExternalFeedback(
  data: ExternalFeedbackResponse,
  now: string,
): TeacherFeedbackDraft {
  const summary = sanitizeFeedbackText(data.summary, 'AI 피드백 초안입니다.');
  const strengths = sanitizeFeedbackTextArray(data.strengths, [
    '구조 확인 결과를 바탕으로 자신의 생각을 점검했습니다.',
  ]);
  const improvementQuestions = sanitizeFeedbackTextArray(
    data.improvementQuestions,
    ['구조 확인 결과와 나의 예측을 비교해 어떤 점을 수정하면 좋을까요?'],
  );
  const studentMessage =
    sanitizeFeedbackText(data.studentMessage, '') ||
    [
      summary,
      ...strengths.map((item) => `- ${item}`),
      ...improvementQuestions.map((item) => `- ${item}`),
    ].join('\n');

  return {
    id: createFeedbackId(now),
    createdAt: now,
    updatedAt: now,
    source: 'ai_api',
    summary,
    strengths,
    improvementQuestions,
    studentMessage: sanitizeFeedbackText(studentMessage, summary),
    teacherReviewNote: sanitizeFeedbackText(
      data.teacherReviewNote,
      'AI 생성 초안입니다. 교사가 사실관계와 표현을 확인한 뒤 학생에게 전달해야 합니다.',
    ),
    reviewRequired: true,
  };
}

export async function createServerFeedbackDraft(
  submission: ActivitySubmission,
  now: string,
): Promise<{
  feedback: TeacherFeedbackDraft;
  studentMessage: string;
  developerMessage: string;
}> {
  const endpoint = getServerFeedbackEndpoint();

  if (endpoint) {
    return createExternalEndpointFeedbackDraft(endpoint, submission, now);
  }

  const openAiApiKey = getOpenAiApiKey();

  if (openAiApiKey) {
    return createOpenAiCompatibleFeedbackDraft(
      openAiApiKey,
      submission,
      now,
    );
  }

  return {
    feedback: buildLocalGuardrailFeedback(submission, now),
    studentMessage:
      'AI API 키가 아직 연결되지 않아 교사용 로컬 검토 초안을 만들었습니다.',
    developerMessage:
      'OPENAI_API_KEY and AI_FEEDBACK_ENDPOINT are not configured. Generated local guardrail feedback preview.',
  };
}

async function createExternalEndpointFeedbackDraft(
  endpoint: string,
  submission: ActivitySubmission,
  now: string,
): Promise<{
  feedback: TeacherFeedbackDraft;
  studentMessage: string;
  developerMessage: string;
}> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(buildFeedbackRequestPayload(submission)),
    });

    if (!response.ok) {
      const responseText = await safeReadResponseText(response);

      return {
        feedback: buildLocalGuardrailFeedback(submission, now),
        studentMessage:
          'AI 피드백 서버에서 초안을 만들지 못해 교사용 로컬 검토 초안을 만들었습니다.',
        developerMessage: `AI feedback endpoint returned HTTP ${response.status}: ${responseText.slice(0, 500)}`,
      };
    }

    const data = (await response.json()) as ExternalFeedbackResponse;

    return {
      feedback: parseExternalFeedback(data, now),
      studentMessage:
        'AI 피드백 초안을 만들었습니다. 교사가 확인한 뒤 학생에게 전달할 수 있습니다.',
      developerMessage: 'AI feedback endpoint completed successfully.',
    };
  } catch (error) {
    return {
      feedback: buildLocalGuardrailFeedback(submission, now),
      studentMessage:
        'AI 피드백 서버에 연결하지 못해 교사용 로컬 검토 초안을 만들었습니다.',
      developerMessage: `AI feedback endpoint fetch failed: ${getErrorMessage(error)}`,
    };
  }
}

async function createOpenAiCompatibleFeedbackDraft(
  apiKey: string,
  submission: ActivitySubmission,
  now: string,
): Promise<{
  feedback: TeacherFeedbackDraft;
  studentMessage: string;
  developerMessage: string;
}> {
  const baseUrl = getOpenAiBaseUrl();
  const model = getOpenAiModel();
  const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: {
          type: 'json_object',
        },
        messages: buildOpenAiFeedbackMessages(submission),
      }),
    });

    if (!response.ok) {
      const responseText = await safeReadResponseText(response);

      return {
        feedback: buildLocalGuardrailFeedback(submission, now),
        studentMessage:
          'AI 피드백 서버에서 초안을 만들지 못해 교사용 로컬 검토 초안을 만들었습니다.',
        developerMessage: `OpenAI-compatible feedback returned HTTP ${response.status}: ${responseText.slice(0, 500)}`,
      };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const parsed = parseOpenAiFeedbackResponse(data);

    return {
      feedback: parseExternalFeedback(parsed, now),
      studentMessage:
        'AI 피드백 초안을 만들었습니다. 교사가 확인한 뒤 학생에게 전달할 수 있습니다.',
      developerMessage:
        'OpenAI-compatible feedback completed successfully. Teacher review is still required.',
    };
  } catch (error) {
    return {
      feedback: buildLocalGuardrailFeedback(submission, now),
      studentMessage:
        'AI 피드백 서버에 연결하지 못해 교사용 로컬 검토 초안을 만들었습니다.',
      developerMessage: `OpenAI-compatible feedback fetch failed: ${getErrorMessage(error)}`,
    };
  }
}

function buildOpenAiFeedbackMessages(
  submission: ActivitySubmission,
): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: [
        '너는 고등학교 화학 수업용 형성 피드백 초안을 작성하는 보조 도구다.',
        '자동 채점, 점수, 등급, 학생 인성/태도 단정은 금지한다.',
        '학생 개인정보를 추론하거나 요청하지 않는다.',
        '검증되지 않은 화학 사실을 확정적으로 말하지 않는다.',
        'RDKit 구조 확인값, 참고 3D 구조, 입체 구조 예측의 출처와 한계를 구분해 설명한다.',
        '학생에게 바로 정답만 주지 말고 다시 생각할 질문을 포함한다.',
        '반드시 교사 검토가 필요하다는 안내를 teacherReviewNote에 포함한다.',
        '응답은 JSON 객체 하나만 반환한다.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify(buildFeedbackRequestPayload(submission)),
    },
  ];
}

function parseOpenAiFeedbackResponse(
  data: Record<string, unknown>,
): ExternalFeedbackResponse {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const firstChoice =
    choices[0] && typeof choices[0] === 'object'
      ? (choices[0] as Record<string, unknown>)
      : null;
  const message =
    firstChoice?.message &&
    typeof firstChoice.message === 'object' &&
    !Array.isArray(firstChoice.message)
      ? (firstChoice.message as Record<string, unknown>)
      : null;
  const content = sanitizeString(message?.content, 8000);

  if (!content) {
    throw new Error('OpenAI-compatible response did not include message content.');
  }

  const parsed = JSON.parse(content) as ExternalFeedbackResponse;

  return parsed;
}

function createFirebaseAdminDependencies(): CreateFeedbackDraftDependencies {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  return {
    verifyIdToken: async (idToken) => auth.verifyIdToken(idToken),
    getClassroom: async (classCode) => {
      const snapshot = await db.collection('classrooms').doc(classCode).get();

      return {
        exists: snapshot.exists,
        ownerTeacherUid: snapshot.get('ownerTeacherUid'),
        teacherUids: snapshot.get('teacherUids'),
      };
    },
    getSubmission: async (classCode, submissionId) => {
      const snapshot = await db
        .collection('classrooms')
        .doc(classCode)
        .collection('submissions')
        .doc(submissionId)
        .get();

      return snapshot.exists
        ? mapSubmissionDocument(snapshot.id, snapshot.data() ?? {})
        : null;
    },
    createDraft: createServerFeedbackDraft,
  };
}

function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const credentialConfig = resolveAdminCredentialConfig(process.env);

  if (!credentialConfig) {
    throw new Error('Firebase Admin credentials are missing.');
  }

  return initializeApp({
    credential: cert({
      projectId: credentialConfig.projectId,
      clientEmail: credentialConfig.clientEmail,
      privateKey: credentialConfig.privateKey,
    }),
    projectId: credentialConfig.projectId,
  });
}

export function resolveAdminCredentialConfig(
  env: Record<string, string | undefined>,
): AdminCredentialConfig | null {
  const encodedServiceAccount =
    env.FIREBASE_SERVICE_ACCOUNT_BASE64 ??
    env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64;

  if (encodedServiceAccount) {
    const parsed = JSON.parse(
      Buffer.from(encodedServiceAccount, 'base64').toString('utf8'),
    ) as Record<string, unknown>;
    const projectId = sanitizeString(parsed.project_id, 120);
    const clientEmail = sanitizeString(parsed.client_email, 240);
    const privateKey = sanitizePrivateKey(parsed.private_key, 4096);

    return projectId && clientEmail && privateKey
      ? { projectId, clientEmail, privateKey }
      : null;
  }

  const projectId =
    sanitizeString(env.FIREBASE_ADMIN_PROJECT_ID, 120) ||
    sanitizeString(env.FIREBASE_PROJECT_ID, 120) ||
    sanitizeString(env.VITE_FIREBASE_PROJECT_ID, 120);
  const clientEmail = sanitizeString(env.FIREBASE_ADMIN_CLIENT_EMAIL, 240);
  const privateKey = sanitizePrivateKey(
    env.FIREBASE_ADMIN_PRIVATE_KEY,
    4096,
  ).replace(/\\n/g, '\n');

  return projectId && clientEmail && privateKey
    ? { projectId, clientEmail, privateKey }
    : null;
}

function mapSubmissionDocument(
  id: string,
  data: Record<string, unknown>,
): ActivitySubmission | null {
  const snapshot = data.snapshot;
  const status = data.status;

  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }

  if (
    status !== 'submitted' &&
    status !== 'feedback_draft' &&
    status !== 'feedback_returned'
  ) {
    return null;
  }

  const submittedAt = sanitizeString(data.submittedAt, 64);
  const updatedAt = sanitizeString(data.updatedAt, 64);

  if (!submittedAt || !updatedAt) {
    return null;
  }

  return removeUndefinedValues({
    id: sanitizeString(id, 120),
    submittedAt,
    updatedAt,
    classCode: sanitizeString(data.classroomId, 24),
    studentDisplayName: sanitizeString(data.studentDisplayName, 24),
    anonymousStudentId: sanitizeString(data.anonymousStudentId, 64),
    snapshot,
    status,
    teacherFeedback:
      data.teacherFeedback &&
      typeof data.teacherFeedback === 'object' &&
      !Array.isArray(data.teacherFeedback)
        ? data.teacherFeedback
        : undefined,
    feedbackReturnedAt: sanitizeString(data.feedbackReturnedAt, 64),
  }) as ActivitySubmission;
}

function isTeacherClaimAccepted(token: VerifiedTeacherToken): boolean {
  return Boolean(token.uid) && (token.teacher === true || token.role === 'teacher');
}

function isAssignedTeacher(
  classroom: ClassroomTeacherAccessRecord,
  teacherUid: string,
): boolean {
  const teacherUids = classroom.teacherUids;

  return (
    classroom.ownerTeacherUid === teacherUid ||
    (teacherUids !== null &&
      typeof teacherUids === 'object' &&
      !Array.isArray(teacherUids) &&
      (teacherUids as Record<string, unknown>)[teacherUid] === true)
  );
}

function getServerFeedbackEndpoint(): string {
  return (
    process.env.AI_FEEDBACK_ENDPOINT?.trim() ||
    process.env.VITE_AI_FEEDBACK_ENDPOINT?.trim() ||
    ''
  );
}

function getOpenAiApiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || '';
}

function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
}

function getOpenAiBaseUrl(): string {
  return process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';
}

async function safeReadResponseText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function sanitizeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizeFeedbackText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, 1400) || fallback;
}

function sanitizeFeedbackTextArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => sanitizeFeedbackText(item, ''))
    .filter(Boolean)
    .slice(0, 5);

  return cleaned.length > 0 ? cleaned : fallback;
}

function isFilledString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function createFeedbackId(now: string): string {
  return `teacher-feedback-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function sanitizePrivateKey(value: unknown, maxLength: number): string {
  return sanitizeString(value, maxLength);
}

export function normalizeJoinClassCode(value: unknown): string {
  return typeof value === 'string'
    ? value
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/\s+/g, '-')
        .toUpperCase()
        .slice(0, 24)
    : '';
}

function invalidRequest(developerMessage: string): {
  ok: false;
  studentMessage: string;
  developerMessage: string;
} {
  return {
    ok: false,
    studentMessage: '피드백 초안 생성 요청 정보를 다시 확인해 주세요.',
    developerMessage: `createFeedbackDraft invalid request: ${developerMessage}`,
  };
}

function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues) as T;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined)
      .map(([key, itemValue]) => [key, removeUndefinedValues(itemValue)]),
  ) as T;
}

function jsonResponse(
  payload: CreateFeedbackDraftApiPayload,
  status: number,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
