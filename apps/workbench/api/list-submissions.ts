import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type ListSubmissionsRequest = {
  idToken: string;
  classCode: string;
};

type ListSubmissionsApiStatus =
  | 'loaded'
  | 'invalid_request'
  | 'server_not_configured'
  | 'unauthorized'
  | 'classroom_not_found'
  | 'server_error';

type ListSubmissionsApiPayload = {
  ok: boolean;
  status: ListSubmissionsApiStatus;
  classCode?: string;
  submissions?: ActivitySubmissionPayload[];
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

type ListSubmissionsDependencies = {
  verifyIdToken: (idToken: string) => Promise<VerifiedTeacherToken>;
  getClassroom: (classCode: string) => Promise<ClassroomTeacherAccessRecord>;
  listSubmissions: (classCode: string) => Promise<ActivitySubmissionPayload[]>;
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
  '서버 제출 목록 조회 설정이 아직 준비되지 않았습니다. 기존 브라우저 제출함은 계속 유지됩니다.';

export default {
  async fetch(request: Request): Promise<Response> {
    return listSubmissionsFetch(request);
  },
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<Response> {
  return listSubmissionsFetch(request);
}

export async function listSubmissionsFetch(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return OPTIONS();
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: '제출 목록 조회 요청 방식이 올바르지 않습니다.',
        developerMessage: `listSubmissions rejected method: ${request.method}`,
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
        studentMessage: '제출 목록 조회 요청을 읽지 못했습니다.',
        developerMessage: 'listSubmissions request body is not valid JSON.',
      },
      400,
    );
  }

  try {
    return handleListSubmissionsBody(body, createFirebaseAdminDependencies());
  } catch (error) {
    console.error('[list-submissions] admin setup failed', {
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_not_configured',
        studentMessage: SERVER_NOT_CONFIGURED_MESSAGE,
        developerMessage: `listSubmissions admin setup failed: ${getErrorMessage(error)}`,
      },
      503,
    );
  }
}

export async function handleListSubmissionsBody(
  body: unknown,
  dependencies: ListSubmissionsDependencies,
): Promise<Response> {
  const parsed = parseListSubmissionsRequest(body);

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

    if (!isTeacherClaimAccepted(decodedToken)) {
      return jsonResponse(
        {
          ok: false,
          status: 'unauthorized',
          classCode: request.classCode,
          studentMessage:
            '교사 권한이 확인된 계정만 서버 제출 목록을 볼 수 있습니다.',
          developerMessage: `listSubmissions rejected teacher claim: uid=${decodedToken.uid || 'missing'}`,
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
          developerMessage: `listSubmissions classroom not found: ${request.classCode}`,
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
            '이 수업방 제출 목록을 볼 교사 권한을 확인하지 못했습니다.',
          developerMessage: `listSubmissions rejected classroom teacher access: classCode=${request.classCode}, uid=${decodedToken.uid}`,
        },
        403,
      );
    }

    const submissions = await dependencies.listSubmissions(request.classCode);

    return jsonResponse(
      {
        ok: true,
        status: 'loaded',
        classCode: request.classCode,
        submissions,
        studentMessage: `서버 제출함에서 ${submissions.length}개의 제출 자료를 불러왔습니다.`,
        developerMessage: `listSubmissions loaded: classCode=${request.classCode}, count=${submissions.length}`,
      },
      200,
    );
  } catch (error) {
    console.error('[list-submissions] request failed', {
      classCode: request.classCode,
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_error',
        classCode: request.classCode,
        studentMessage:
          '서버 제출 목록 조회 중 문제가 발생했습니다. 교사 권한과 수업코드를 확인해 주세요.',
        developerMessage: `listSubmissions failed: ${getErrorMessage(error)}`,
      },
      500,
    );
  }
}

export function parseListSubmissionsRequest(
  body: unknown,
):
  | { ok: true; data: ListSubmissionsRequest }
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

function createFirebaseAdminDependencies(): ListSubmissionsDependencies {
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
    listSubmissions: async (classCode) => {
      const snapshot = await db
        .collection('classrooms')
        .doc(classCode)
        .collection('submissions')
        .get();

      return snapshot.docs
        .map((documentSnapshot) =>
          mapSubmissionDocument(documentSnapshot.id, documentSnapshot.data()),
        )
        .filter(
          (submission): submission is ActivitySubmissionPayload =>
            Boolean(submission),
        )
        .sort((left, right) => right.submittedAt.localeCompare(left.submittedAt));
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
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function removeUndefinedValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined && itemValue !== '')
      .map(([key, itemValue]) => [key, removeUndefinedValues(itemValue)]),
  );
}

function invalidRequest(reason: string) {
  return {
    ok: false as const,
    studentMessage: '제출 목록 조회 요청 정보를 다시 확인해 주세요.',
    developerMessage: `listSubmissions invalid request: ${reason}`,
  };
}

function jsonResponse(
  payload: ListSubmissionsApiPayload,
  status: number,
): Response {
  return Response.json(payload, {
    status,
    headers: jsonHeaders,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
