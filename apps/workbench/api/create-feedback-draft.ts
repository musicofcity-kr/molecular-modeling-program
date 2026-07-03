import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { ActivitySubmission, TeacherFeedbackDraft } from '../src/types/feedback';
import {
  buildFeedbackRequestPayload,
  buildLocalGuardrailFeedback,
  parseExternalFeedback,
  type ExternalFeedbackResponse,
} from '../src/services/feedbackDraftCore';

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

async function createServerFeedbackDraft(
  submission: ActivitySubmission,
  now: string,
): Promise<{
  feedback: TeacherFeedbackDraft;
  studentMessage: string;
  developerMessage: string;
}> {
  const endpoint = getServerFeedbackEndpoint();

  if (!endpoint) {
    return {
      feedback: buildLocalGuardrailFeedback(submission, now),
      studentMessage:
        'AI API 엔드포인트가 아직 연결되지 않아 교사용 로컬 검토 초안을 만들었습니다.',
      developerMessage:
        'AI_FEEDBACK_ENDPOINT is not configured. Generated local guardrail feedback preview.',
    };
  }

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
