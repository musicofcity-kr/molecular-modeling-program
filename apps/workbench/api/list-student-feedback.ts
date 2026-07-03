import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type ListStudentFeedbackStatus =
  | 'loaded'
  | 'invalid_request'
  | 'server_not_configured'
  | 'unauthorized'
  | 'classroom_not_found'
  | 'membership_required'
  | 'server_error';

type ListStudentFeedbackRequest = {
  idToken: string;
  classCode: string;
};

type ActivitySubmissionPayload = {
  id: string;
  submittedAt: string;
  updatedAt: string;
  classCode?: string;
  studentDisplayName?: string;
  anonymousStudentId?: string;
  studentUid?: string;
  snapshot: Record<string, unknown>;
  status: 'submitted' | 'feedback_draft' | 'feedback_returned';
  teacherFeedback?: Record<string, unknown>;
  feedbackReturnedAt?: string;
};

type ListStudentFeedbackPayload = {
  ok: boolean;
  status: ListStudentFeedbackStatus;
  classCode?: string;
  submissions?: ActivitySubmissionPayload[];
  studentMessage: string;
  developerMessage: string;
};

type VerifiedStudentToken = {
  uid: string;
};

type ListStudentFeedbackDependencies = {
  verifyIdToken: (idToken: string) => Promise<VerifiedStudentToken>;
  classroomExists: (classCode: string) => Promise<boolean>;
  membershipExists: (classCode: string, uid: string) => Promise<boolean>;
  listReturnedFeedbacks: (
    classCode: string,
    uid: string,
  ) => Promise<ActivitySubmissionPayload[]>;
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
  '서버 피드백 조회 설정이 아직 준비되지 않았습니다. 현재 브라우저 제출함은 계속 유지됩니다.';

export default {
  async fetch(request: Request): Promise<Response> {
    return listStudentFeedbackFetch(request);
  },
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<Response> {
  return listStudentFeedbackFetch(request);
}

export async function listStudentFeedbackFetch(
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
        studentMessage: '교사 피드백 조회 요청 방식이 올바르지 않습니다.',
        developerMessage: `listStudentFeedback rejected method: ${request.method}`,
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
        studentMessage: '교사 피드백 조회 요청을 읽지 못했습니다.',
        developerMessage: 'listStudentFeedback request body is not valid JSON.',
      },
      400,
    );
  }

  try {
    return handleListStudentFeedbackBody(
      body,
      createFirebaseAdminDependencies(),
    );
  } catch (error) {
    console.error('[list-student-feedback] admin setup failed', {
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_not_configured',
        studentMessage: SERVER_NOT_CONFIGURED_MESSAGE,
        developerMessage: `listStudentFeedback admin setup failed: ${getErrorMessage(error)}`,
      },
      503,
    );
  }
}

export async function handleListStudentFeedbackBody(
  body: unknown,
  dependencies: ListStudentFeedbackDependencies,
): Promise<Response> {
  const parsed = parseListStudentFeedbackRequest(body);

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

  try {
    const decodedToken = await dependencies.verifyIdToken(request.idToken);

    if (!decodedToken.uid) {
      return jsonResponse(
        {
          ok: false,
          status: 'unauthorized',
          classCode: request.classCode,
          studentMessage: '학생 인증 정보를 확인하지 못했습니다.',
          developerMessage: 'listStudentFeedback rejected missing uid.',
        },
        403,
      );
    }

    const exists = await dependencies.classroomExists(request.classCode);

    if (!exists) {
      return jsonResponse(
        {
          ok: false,
          status: 'classroom_not_found',
          classCode: request.classCode,
          studentMessage: '해당 수업코드의 서버 수업방을 찾지 못했습니다.',
          developerMessage: `listStudentFeedback classroom not found: ${request.classCode}`,
        },
        404,
      );
    }

    const isMember = await dependencies.membershipExists(
      request.classCode,
      decodedToken.uid,
    );

    if (!isMember) {
      return jsonResponse(
        {
          ok: false,
          status: 'membership_required',
          classCode: request.classCode,
          studentMessage:
            '수업방 입장 확인이 끝난 학생만 교사 피드백을 볼 수 있습니다.',
          developerMessage: `listStudentFeedback membership missing: classCode=${request.classCode}, uid=${decodedToken.uid}`,
        },
        403,
      );
    }

    const submissions = await dependencies.listReturnedFeedbacks(
      request.classCode,
      decodedToken.uid,
    );

    return jsonResponse(
      {
        ok: true,
        status: 'loaded',
        classCode: request.classCode,
        submissions,
        studentMessage: `교사가 전달한 피드백 ${submissions.length}개를 불러왔습니다.`,
        developerMessage: `listStudentFeedback loaded: classCode=${request.classCode}, uid=${decodedToken.uid}, count=${submissions.length}`,
      },
      200,
    );
  } catch (error) {
    console.error('[list-student-feedback] request failed', {
      classCode: request.classCode,
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_error',
        classCode: request.classCode,
        studentMessage:
          '교사 피드백 조회 중 문제가 발생했습니다. 수업코드와 입장 상태를 확인해 주세요.',
        developerMessage: `listStudentFeedback failed: ${getErrorMessage(error)}`,
      },
      500,
    );
  }
}

export function parseListStudentFeedbackRequest(
  body: unknown,
):
  | { ok: true; data: ListStudentFeedbackRequest }
  | { ok: false; studentMessage: string; developerMessage: string } {
  if (!body || typeof body !== 'object') {
    return invalidRequest('request body is not an object');
  }

  const candidate = body as Record<string, unknown>;
  const idToken = sanitizeString(candidate.idToken, 8192);
  const classCode = normalizeJoinClassCode(candidate.classCode);

  if (!idToken) {
    return invalidRequest('idToken is missing');
  }

  if (!classCode) {
    return invalidRequest('classCode is missing');
  }

  return {
    ok: true,
    data: {
      idToken,
      classCode,
    },
  };
}

function createFirebaseAdminDependencies(): ListStudentFeedbackDependencies {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  return {
    verifyIdToken: async (idToken) => auth.verifyIdToken(idToken),
    classroomExists: async (classCode) => {
      const snapshot = await db.collection('classrooms').doc(classCode).get();

      return snapshot.exists;
    },
    membershipExists: async (classCode, uid) => {
      const snapshot = await db
        .collection('classrooms')
        .doc(classCode)
        .collection('students')
        .doc(uid)
        .get();

      return snapshot.exists;
    },
    listReturnedFeedbacks: async (classCode, uid) => {
      const snapshot = await db
        .collection('classrooms')
        .doc(classCode)
        .collection('submissions')
        .get();

      return snapshot.docs
        .filter((documentSnapshot) => documentSnapshot.get('studentUid') === uid)
        .map((documentSnapshot) =>
          mapSubmissionDocument(documentSnapshot.id, documentSnapshot.data()),
        )
        .filter(
          (submission): submission is ActivitySubmissionPayload =>
            submission !== null &&
            submission.status === 'feedback_returned' &&
            submission.teacherFeedback !== undefined,
        )
        .sort((left, right) =>
          (right.feedbackReturnedAt ?? right.updatedAt).localeCompare(
            left.feedbackReturnedAt ?? left.updatedAt,
          ),
        );
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
    studentUid: sanitizeString(data.studentUid, 128),
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

function invalidRequest(developerMessage: string): {
  ok: false;
  studentMessage: string;
  developerMessage: string;
} {
  return {
    ok: false,
    studentMessage: '교사 피드백 조회 요청 정보를 다시 확인해 주세요.',
    developerMessage: `listStudentFeedback invalid request: ${developerMessage}`,
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
  payload: ListStudentFeedbackPayload,
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
