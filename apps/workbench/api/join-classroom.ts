import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type JoinClassroomRequest = {
  idToken: string;
  classCode: string;
  joinCode: string;
  displayName: string;
  anonymousStudentId: string;
};

type JoinClassroomApiStatus =
  | 'joined'
  | 'invalid_request'
  | 'server_not_configured'
  | 'unauthorized'
  | 'classroom_not_found'
  | 'join_disabled'
  | 'server_error';

type JoinClassroomApiPayload = {
  ok: boolean;
  status: JoinClassroomApiStatus;
  classCode?: string;
  studentMessage: string;
  developerMessage: string;
};

type VerifiedIdToken = {
  uid: string;
};

type ClassroomRecord = {
  exists: boolean;
  joinEnabled?: unknown;
  joinCodeHash?: unknown;
};

type JoinClassroomDependencies = {
  verifyIdToken: (idToken: string) => Promise<VerifiedIdToken>;
  getClassroom: (classCode: string) => Promise<ClassroomRecord>;
  writeMembership: (
    classCode: string,
    uid: string,
    document: StudentMembershipDocument,
  ) => Promise<void>;
  now: () => string;
};

type StudentMembershipDocument = {
  uid: string;
  displayName: string;
  anonymousStudentId: string;
  joinedAt: string;
  lastActiveAt: string;
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
  '서버 수업코드 확인 설정이 아직 준비되지 않았습니다. 현재 브라우저에서 활동을 계속할 수 있습니다.';

export default {
  async fetch(request: Request): Promise<Response> {
    return joinClassroomFetch(request);
  },
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<Response> {
  return joinClassroomFetch(request);
}

export async function joinClassroomFetch(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return OPTIONS();
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: '수업코드 확인 요청 방식이 올바르지 않습니다.',
        developerMessage: `joinClassroom rejected method: ${request.method}`,
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
        studentMessage: '수업코드 확인 요청을 읽지 못했습니다.',
        developerMessage: 'joinClassroom request body is not valid JSON.',
      },
      400,
    );
  }

  try {
    return handleJoinClassroomBody(body, createFirebaseAdminDependencies());
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        status: 'server_not_configured',
        studentMessage: SERVER_NOT_CONFIGURED_MESSAGE,
        developerMessage: `joinClassroom admin setup failed: ${getErrorMessage(error)}`,
      },
      503,
    );
  }
}

export async function handleJoinClassroomBody(
  body: unknown,
  dependencies: JoinClassroomDependencies,
): Promise<Response> {
  const parsed = parseJoinClassroomRequest(body);

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
          studentMessage: '수업 입장 인증을 확인하지 못했습니다.',
          developerMessage: 'joinClassroom verified token did not include uid.',
        },
        401,
      );
    }

    const classroom = await dependencies.getClassroom(request.classCode);

    if (!classroom.exists) {
      return jsonResponse(
        {
          ok: false,
          status: 'classroom_not_found',
          classCode: request.classCode,
          studentMessage:
            '수업코드를 서버에서 확인하지 못했습니다. 수업코드를 다시 확인해 주세요.',
          developerMessage: `joinClassroom classroom not found: ${request.classCode}`,
        },
        404,
      );
    }

    if (classroom.joinEnabled !== true) {
      return jsonResponse(
        {
          ok: false,
          status: 'join_disabled',
          classCode: request.classCode,
          studentMessage:
            '이 수업방은 아직 학생 입장이 열려 있지 않습니다. 교사에게 확인해 주세요.',
          developerMessage: `joinClassroom disabled: ${request.classCode}`,
        },
        403,
      );
    }

    if (!isJoinCodeAccepted(classroom, request)) {
      return jsonResponse(
        {
          ok: false,
          status: 'join_disabled',
          classCode: request.classCode,
          studentMessage:
            '입장 확인코드가 맞지 않습니다. 교사가 안내한 코드를 다시 확인해 주세요.',
          developerMessage: `joinClassroom rejected join code: classCode=${request.classCode}`,
        },
        403,
      );
    }

    const now = dependencies.now();
    const membership = buildStudentMembershipDocument({
      uid: decodedToken.uid,
      displayName: request.displayName,
      anonymousStudentId: request.anonymousStudentId,
      now,
    });

    await dependencies.writeMembership(
      request.classCode,
      decodedToken.uid,
      membership,
    );

    return jsonResponse(
      {
        ok: true,
        status: 'joined',
        classCode: request.classCode,
        studentMessage:
          '수업코드 확인이 완료되었습니다. 활동 결과를 서버 제출함에 보낼 수 있습니다.',
        developerMessage: `joinClassroom membership created: classCode=${request.classCode}, uid=${decodedToken.uid}`,
      },
      200,
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        status: 'server_error',
        classCode: request.classCode,
        studentMessage:
          '수업코드 서버 확인 중 문제가 발생했습니다. 현재 브라우저에서 활동을 계속할 수 있습니다.',
        developerMessage: `joinClassroom failed: ${getErrorMessage(error)}`,
      },
      500,
    );
  }
}

export function parseJoinClassroomRequest(
  body: unknown,
):
  | { ok: true; data: JoinClassroomRequest }
  | { ok: false; studentMessage: string; developerMessage: string } {
  if (!body || typeof body !== 'object') {
    return invalidRequest('request body is not an object');
  }

  const candidate = body as Record<string, unknown>;
  const idToken = sanitizeString(candidate.idToken, 8192);
  const classCode = normalizeClassCode(candidate.classCode);
  const joinCode = normalizeJoinCode(candidate.joinCode);
  const displayName = sanitizeStudentText(candidate.displayName, 24);
  const anonymousStudentId = sanitizeStudentText(
    candidate.anonymousStudentId,
    64,
  );

  if (!idToken) {
    return invalidRequest('idToken is missing');
  }

  if (!classCode) {
    return invalidRequest('classCode is missing');
  }

  if (!joinCode) {
    return invalidRequest('joinCode is missing');
  }

  if (!anonymousStudentId) {
    return invalidRequest('anonymousStudentId is missing');
  }

  return {
    ok: true,
    data: {
      idToken,
      classCode,
      joinCode,
      displayName: displayName || '익명 학생',
      anonymousStudentId,
    },
  };
}

export function buildStudentMembershipDocument(input: {
  uid: string;
  displayName: string;
  anonymousStudentId: string;
  now: string;
}): StudentMembershipDocument {
  return {
    uid: input.uid,
    displayName: sanitizeStudentText(input.displayName, 24) || '익명 학생',
    anonymousStudentId: sanitizeStudentText(input.anonymousStudentId, 64),
    joinedAt: input.now,
    lastActiveAt: input.now,
  };
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

function createFirebaseAdminDependencies(): JoinClassroomDependencies {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  return {
    verifyIdToken: async (idToken) => auth.verifyIdToken(idToken),
    getClassroom: async (classCode) => {
      const snapshot = await db.collection('classrooms').doc(classCode).get();

      return {
        exists: snapshot.exists,
        joinEnabled: snapshot.get('joinEnabled'),
        joinCodeHash: snapshot.get('joinCodeHash'),
      };
    },
    writeMembership: async (classCode, uid, document) => {
      await db
        .collection('classrooms')
        .doc(classCode)
        .collection('students')
        .doc(uid)
        .set(document, { merge: true });
    },
    now: () => new Date().toISOString(),
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

function normalizeClassCode(value: unknown): string {
  return normalizeJoinClassCode(sanitizeString(value, 24));
}

export function normalizeJoinCode(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, '').toUpperCase().slice(0, 32)
    : '';
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

export function buildJoinCodeHash(input: {
  classCode: string;
  joinCode: string;
}): string {
  const classCode = normalizeJoinClassCode(input.classCode);
  const joinCode = normalizeJoinCode(input.joinCode);

  if (!classCode || !joinCode) {
    return '';
  }

  return `client-join-code-v1-${fnv1a(`${classCode}:${joinCode}`)}`;
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function isJoinCodeAccepted(
  classroom: ClassroomRecord,
  request: JoinClassroomRequest,
): boolean {
  return (
    typeof classroom.joinCodeHash === 'string' &&
    classroom.joinCodeHash ===
      buildJoinCodeHash({
        classCode: request.classCode,
        joinCode: request.joinCode,
      })
  );
}

function sanitizeStudentText(value: unknown, maxLength: number): string {
  return sanitizeString(value, maxLength).replace(/\s+/g, ' ');
}

function sanitizeString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function sanitizePrivateKey(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function invalidRequest(reason: string) {
  return {
    ok: false as const,
    studentMessage: '수업코드 확인 요청 정보를 다시 확인해 주세요.',
    developerMessage: `joinClassroom invalid request: ${reason}`,
  };
}

function jsonResponse(payload: JoinClassroomApiPayload, status: number): Response {
  return Response.json(payload, {
    status,
    headers: jsonHeaders,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
