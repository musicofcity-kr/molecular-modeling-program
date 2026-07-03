import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type UpdateFeedbackApiStatus =
  | 'updated'
  | 'invalid_request'
  | 'server_not_configured'
  | 'unauthorized'
  | 'classroom_not_found'
  | 'submission_not_found'
  | 'server_error';

type FeedbackUpdateStatus = 'feedback_draft' | 'feedback_returned';

type TeacherFeedbackDraftPayload = {
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

type UpdateFeedbackRequest = {
  idToken: string;
  classCode: string;
  submissionId: string;
  feedback: TeacherFeedbackDraftPayload;
  status: FeedbackUpdateStatus;
};

type ActivitySubmissionPayload = {
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

type UpdateFeedbackApiPayload = {
  ok: boolean;
  status: UpdateFeedbackApiStatus;
  classCode?: string;
  submission?: ActivitySubmissionPayload;
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

type UpdateFeedbackDependencies = {
  verifyIdToken: (idToken: string) => Promise<VerifiedTeacherToken>;
  getClassroom: (classCode: string) => Promise<ClassroomTeacherAccessRecord>;
  getSubmission: (
    classCode: string,
    submissionId: string,
  ) => Promise<ActivitySubmissionPayload | null>;
  updateFeedback: (
    classCode: string,
    submissionId: string,
    feedback: TeacherFeedbackDraftPayload,
    status: FeedbackUpdateStatus,
    now: string,
  ) => Promise<ActivitySubmissionPayload | null>;
  now?: () => string;
};

type AdminCredentialConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
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
  '서버 피드백 반환 설정이 아직 준비되지 않았습니다. 교사용 로컬 피드백은 계속 유지됩니다.';

export default {
  async fetch(request: Request): Promise<Response> {
    return updateFeedbackFetch(request);
  },
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<Response> {
  return updateFeedbackFetch(request);
}

export async function updateFeedbackFetch(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return OPTIONS();
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: '피드백 저장 요청 방식이 올바르지 않습니다.',
        developerMessage: `updateFeedback rejected method: ${request.method}`,
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
        studentMessage: '피드백 저장 요청을 읽지 못했습니다.',
        developerMessage: 'updateFeedback request body is not valid JSON.',
      },
      400,
    );
  }

  try {
    return handleUpdateFeedbackBody(body, createFirebaseAdminDependencies());
  } catch (error) {
    console.error('[update-feedback] admin setup failed', {
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_not_configured',
        studentMessage: SERVER_NOT_CONFIGURED_MESSAGE,
        developerMessage: `updateFeedback admin setup failed: ${getErrorMessage(error)}`,
      },
      503,
    );
  }
}

export async function handleUpdateFeedbackBody(
  body: unknown,
  dependencies: UpdateFeedbackDependencies,
): Promise<Response> {
  const parsed = parseUpdateFeedbackRequest(body);

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
            '교사 권한이 확인된 계정만 서버 피드백을 저장할 수 있습니다.',
          developerMessage: `updateFeedback rejected teacher claim: uid=${decodedToken.uid || 'missing'}`,
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
          developerMessage: `updateFeedback classroom not found: ${request.classCode}`,
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
            '이 수업방 피드백을 저장할 교사 권한을 확인하지 못했습니다.',
          developerMessage: `updateFeedback rejected classroom teacher access: classCode=${request.classCode}, uid=${decodedToken.uid}`,
        },
        403,
      );
    }

    const existingSubmission = await dependencies.getSubmission(
      request.classCode,
      request.submissionId,
    );

    if (!existingSubmission) {
      return jsonResponse(
        {
          ok: false,
          status: 'submission_not_found',
          classCode: request.classCode,
          studentMessage: '피드백을 저장할 제출 자료를 찾지 못했습니다.',
          developerMessage: `updateFeedback submission not found: classCode=${request.classCode}, submission=${request.submissionId}`,
        },
        404,
      );
    }

    const submission = await dependencies.updateFeedback(
      request.classCode,
      request.submissionId,
      request.feedback,
      request.status,
      now,
    );

    if (!submission) {
      return jsonResponse(
        {
          ok: false,
          status: 'submission_not_found',
          classCode: request.classCode,
          studentMessage: '피드백 저장 후 제출 자료를 다시 읽지 못했습니다.',
          developerMessage: `updateFeedback updated but remap failed: classCode=${request.classCode}, submission=${request.submissionId}`,
        },
        404,
      );
    }

    return jsonResponse(
      {
        ok: true,
        status: 'updated',
        classCode: request.classCode,
        submission,
        studentMessage:
          request.status === 'feedback_returned'
            ? '서버 제출함에도 교사 피드백을 전달했습니다.'
            : '서버 제출함에도 피드백 초안을 저장했습니다.',
        developerMessage: `updateFeedback updated: classCode=${request.classCode}, submission=${request.submissionId}, status=${request.status}`,
      },
      200,
    );
  } catch (error) {
    console.error('[update-feedback] request failed', {
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
          '서버 피드백 저장 중 문제가 발생했습니다. 교사 권한과 수업코드를 확인해 주세요.',
        developerMessage: `updateFeedback failed: ${getErrorMessage(error)}`,
      },
      500,
    );
  }
}

export function parseUpdateFeedbackRequest(
  body: unknown,
):
  | { ok: true; data: UpdateFeedbackRequest }
  | { ok: false; studentMessage: string; developerMessage: string } {
  if (!body || typeof body !== 'object') {
    return invalidRequest('request body is not an object');
  }

  const candidate = body as Record<string, unknown>;
  const idToken = sanitizeString(candidate.idToken, 8192);
  const classCode = normalizeJoinClassCode(candidate.classCode);
  const submissionId = sanitizeString(candidate.submissionId, 120);
  const status = candidate.status;
  const feedback = parseTeacherFeedbackDraft(candidate.feedback);

  if (!idToken) {
    return invalidRequest('idToken is missing');
  }

  if (!classCode) {
    return invalidRequest('classCode is missing');
  }

  if (!submissionId) {
    return invalidRequest('submissionId is missing');
  }

  if (status !== 'feedback_draft' && status !== 'feedback_returned') {
    return invalidRequest('feedback status is invalid');
  }

  if (!feedback.ok) {
    return invalidRequest(feedback.developerMessage);
  }

  return {
    ok: true,
    data: {
      idToken,
      classCode,
      submissionId,
      feedback: feedback.data,
      status,
    },
  };
}

export function buildFirestoreFeedbackUpdateDocument(input: {
  feedback: TeacherFeedbackDraftPayload;
  status: FeedbackUpdateStatus;
  now: string;
}): Record<string, unknown> {
  return removeUndefinedValues({
    status: input.status,
    updatedAt: input.now,
    teacherFeedback: {
      ...input.feedback,
      updatedAt: input.now,
    },
    feedbackReturnedAt:
      input.status === 'feedback_returned' ? input.now : undefined,
  });
}

function createFirebaseAdminDependencies(): UpdateFeedbackDependencies {
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
    updateFeedback: async (classCode, submissionId, feedback, status, now) => {
      const ref = db
        .collection('classrooms')
        .doc(classCode)
        .collection('submissions')
        .doc(submissionId);

      await ref.update(buildFirestoreFeedbackUpdateDocument({ feedback, status, now }));
      const snapshot = await ref.get();

      return snapshot.exists
        ? mapSubmissionDocument(snapshot.id, snapshot.data() ?? {})
        : null;
    },
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

function parseTeacherFeedbackDraft(
  value: unknown,
):
  | { ok: true; data: TeacherFeedbackDraftPayload }
  | { ok: false; developerMessage: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, developerMessage: 'feedback is not an object' };
  }

  const candidate = value as Record<string, unknown>;
  const id = sanitizeString(candidate.id, 120);
  const createdAt = sanitizeString(candidate.createdAt, 64);
  const updatedAt = sanitizeString(candidate.updatedAt, 64);
  const source = candidate.source;
  const summary = sanitizeString(candidate.summary, 1400);
  const strengths = sanitizeStringArray(candidate.strengths, 5, 700);
  const improvementQuestions = sanitizeStringArray(
    candidate.improvementQuestions,
    5,
    700,
  );
  const studentMessage = sanitizeString(candidate.studentMessage, 2200);
  const teacherReviewNote = sanitizeString(candidate.teacherReviewNote, 1400);

  if (!id || !createdAt || !updatedAt) {
    return {
      ok: false,
      developerMessage: 'feedback id or timestamp fields are missing',
    };
  }

  if (source !== 'ai_api' && source !== 'local_guardrail_preview') {
    return { ok: false, developerMessage: 'feedback source is invalid' };
  }

  if (!summary || !studentMessage || !teacherReviewNote) {
    return {
      ok: false,
      developerMessage: 'feedback required text fields are missing',
    };
  }

  return {
    ok: true,
    data: {
      id,
      createdAt,
      updatedAt,
      source,
      summary,
      strengths,
      improvementQuestions,
      studentMessage,
      teacherReviewNote,
      reviewRequired: candidate.reviewRequired !== false,
    },
  };
}

function mapSubmissionDocument(
  id: string,
  data: Record<string, unknown>,
): ActivitySubmissionPayload | null {
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
  }) as ActivitySubmissionPayload;
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

function sanitizeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizePrivateKey(value: unknown, maxLength: number): string {
  return sanitizeString(value, maxLength);
}

function sanitizeStringArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => sanitizeString(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function invalidRequest(developerMessage: string): {
  ok: false;
  studentMessage: string;
  developerMessage: string;
} {
  return {
    ok: false,
    studentMessage: '피드백 저장 요청 정보를 다시 확인해 주세요.',
    developerMessage: `updateFeedback invalid request: ${developerMessage}`,
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

function jsonResponse(payload: UpdateFeedbackApiPayload, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
