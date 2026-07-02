import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type CreateClassroomDraft = {
  title: string;
  classCode: string;
  joinCode: string;
  activityTemplateIds: string[];
};

type CreateClassroomRequest = {
  idToken: string;
  draft: CreateClassroomDraft;
};

type CreateClassroomApiStatus =
  | 'created'
  | 'invalid_request'
  | 'server_not_configured'
  | 'unauthorized'
  | 'server_error';

type CreateClassroomApiPayload = {
  ok: boolean;
  status: CreateClassroomApiStatus;
  classCode?: string;
  studentMessage: string;
  developerMessage: string;
};

type VerifiedTeacherToken = {
  uid: string;
  teacher?: unknown;
  role?: unknown;
};

type CreateClassroomDependencies = {
  verifyIdToken: (idToken: string) => Promise<VerifiedTeacherToken>;
  writeClassroom: (
    classCode: string,
    documents: ClassroomWriteDocuments,
  ) => Promise<void>;
  now: () => string;
};

type ClassroomDocument = {
  ownerTeacherUid: string;
  teacherUids: Record<string, true>;
  title: string;
  joinCodeHash: string;
  joinEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type ClassroomPublicInfoDocument = {
  title: string;
  activityTemplateIds: string[];
  updatedAt: string;
};

type PublishedActivityTemplateDocument = {
  id: string;
  published: true;
  createdAt: string;
  updatedAt: string;
};

type ClassroomWriteDocuments = {
  classroom: ClassroomDocument;
  publicInfo: ClassroomPublicInfoDocument;
  activityTemplates: Record<string, PublishedActivityTemplateDocument>;
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
  '서버 수업방 생성 설정이 아직 준비되지 않았습니다. 현재 교사용 안내 화면은 계속 사용할 수 있습니다.';

export default {
  async fetch(request: Request): Promise<Response> {
    return createClassroomFetch(request);
  },
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<Response> {
  return createClassroomFetch(request);
}

export async function createClassroomFetch(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return OPTIONS();
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: '수업방 생성 요청 방식이 올바르지 않습니다.',
        developerMessage: `createClassroom rejected method: ${request.method}`,
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
        studentMessage: '수업방 생성 요청을 읽지 못했습니다.',
        developerMessage: 'createClassroom request body is not valid JSON.',
      },
      400,
    );
  }

  try {
    return handleCreateClassroomBody(body, createFirebaseAdminDependencies());
  } catch (error) {
    console.error('[create-classroom] admin setup failed', {
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_not_configured',
        studentMessage: SERVER_NOT_CONFIGURED_MESSAGE,
        developerMessage: `createClassroom admin setup failed: ${getErrorMessage(error)}`,
      },
      503,
    );
  }
}

export async function handleCreateClassroomBody(
  body: unknown,
  dependencies: CreateClassroomDependencies,
): Promise<Response> {
  const parsed = parseCreateClassroomRequest(body);

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
          classCode: request.draft.classCode,
          studentMessage:
            '교사 권한이 확인된 계정만 서버 수업방을 만들 수 있습니다.',
          developerMessage: `createClassroom rejected teacher claim: uid=${decodedToken.uid || 'missing'}`,
        },
        403,
      );
    }

    const now = dependencies.now();
    const documents = buildClassroomWriteDocuments({
      draft: request.draft,
      teacherUid: decodedToken.uid,
      now,
    });

    await dependencies.writeClassroom(request.draft.classCode, documents);

    return jsonResponse(
      {
        ok: true,
        status: 'created',
        classCode: request.draft.classCode,
        studentMessage:
          '서버 수업방을 만들었습니다. 학생에게 수업코드와 입장 확인코드를 함께 안내해 주세요.',
        developerMessage: `createClassroom created: classCode=${request.draft.classCode}, uid=${decodedToken.uid}`,
      },
      200,
    );
  } catch (error) {
    console.error('[create-classroom] request failed', {
      classCode: request.draft.classCode,
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_error',
        classCode: request.draft.classCode,
        studentMessage:
          '서버 수업방 생성 중 문제가 발생했습니다. 교사 권한과 서버 설정을 확인해 주세요.',
        developerMessage: `createClassroom failed: ${getErrorMessage(error)}`,
      },
      500,
    );
  }
}

export function parseCreateClassroomRequest(
  body: unknown,
):
  | { ok: true; data: CreateClassroomRequest }
  | { ok: false; studentMessage: string; developerMessage: string } {
  if (!body || typeof body !== 'object') {
    return invalidRequest('request body is not an object');
  }

  const candidate = body as Record<string, unknown>;
  const idToken = sanitizeString(candidate.idToken, 8192);
  const draft = candidate.draft;

  if (!idToken) {
    return invalidRequest('idToken is missing');
  }

  if (!draft || typeof draft !== 'object') {
    return invalidRequest('draft is missing');
  }

  const draftCandidate = draft as Record<string, unknown>;
  const title = sanitizeStudentText(draftCandidate.title, 80);
  const classCode = normalizeJoinClassCode(draftCandidate.classCode);
  const joinCode = normalizeJoinCode(draftCandidate.joinCode);
  const activityTemplateIds = normalizeActivityTemplateIds(
    draftCandidate.activityTemplateIds,
  );

  if (!title || !classCode || !joinCode || activityTemplateIds.length === 0) {
    return invalidRequest(
      `draft fields are incomplete: title=${Boolean(title)}, classCode=${Boolean(
        classCode,
      )}, joinCode=${Boolean(joinCode)}, templates=${activityTemplateIds.length}`,
    );
  }

  return {
    ok: true,
    data: {
      idToken,
      draft: {
        title,
        classCode,
        joinCode,
        activityTemplateIds,
      },
    },
  };
}

export function buildClassroomWriteDocuments(input: {
  draft: CreateClassroomDraft;
  teacherUid: string;
  now: string;
}): ClassroomWriteDocuments {
  const title = sanitizeStudentText(input.draft.title, 80);
  const classCode = normalizeJoinClassCode(input.draft.classCode);
  const activityTemplateIds = normalizeActivityTemplateIds(
    input.draft.activityTemplateIds,
  );

  return {
    classroom: {
      ownerTeacherUid: input.teacherUid,
      teacherUids: {
        [input.teacherUid]: true,
      },
      title,
      joinCodeHash: buildJoinCodeHash({
        classCode,
        joinCode: input.draft.joinCode,
      }),
      joinEnabled: true,
      createdAt: input.now,
      updatedAt: input.now,
    },
    publicInfo: {
      title,
      activityTemplateIds,
      updatedAt: input.now,
    },
    activityTemplates: Object.fromEntries(
      activityTemplateIds.map((id) => [
        id,
        {
          id,
          published: true as const,
          createdAt: input.now,
          updatedAt: input.now,
        },
      ]),
    ),
  };
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

function createFirebaseAdminDependencies(): CreateClassroomDependencies {
  const app = getFirebaseAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  return {
    verifyIdToken: async (idToken) => auth.verifyIdToken(idToken),
    writeClassroom: async (classCode, documents) => {
      const classroomRef = db.collection('classrooms').doc(classCode);

      await classroomRef.set(documents.classroom);
      await classroomRef.collection('public').doc('info').set(documents.publicInfo);
      await Promise.all(
        Object.values(documents.activityTemplates).map((template) =>
          classroomRef
            .collection('activityTemplates')
            .doc(template.id)
            .set(template),
        ),
      );
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

function resolveAdminCredentialConfig(
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

function isTeacherClaimAccepted(token: VerifiedTeacherToken): boolean {
  return Boolean(token.uid) && (token.teacher === true || token.role === 'teacher');
}

function normalizeActivityTemplateIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => sanitizeString(item, 80))
        .filter((item) => /^[a-z0-9_-]+$/i.test(item)),
    ),
  ).slice(0, 20);
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
    studentMessage: '수업방 생성 요청 정보를 다시 확인해 주세요.',
    developerMessage: `createClassroom invalid request: ${reason}`,
  };
}

function jsonResponse(
  payload: CreateClassroomApiPayload,
  status: number,
): Response {
  return Response.json(payload, {
    status,
    headers: jsonHeaders,
  });
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
