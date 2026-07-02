import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type SaveSubmissionApiStatus =
  | 'saved'
  | 'invalid_request'
  | 'server_not_configured'
  | 'unauthorized'
  | 'classroom_not_found'
  | 'membership_required'
  | 'server_error';

type ActivitySubmissionPayload = {
  id: string;
  submittedAt: string;
  updatedAt: string;
  classCode: string;
  studentDisplayName?: string;
  anonymousStudentId?: string;
  snapshot: Record<string, unknown>;
  status: 'submitted';
};

type SaveSubmissionRequest = {
  idToken: string;
  submission: ActivitySubmissionPayload;
};

type SaveSubmissionApiPayload = {
  ok: boolean;
  status: SaveSubmissionApiStatus;
  classCode?: string;
  submission?: ActivitySubmissionPayload;
  studentMessage: string;
  developerMessage: string;
};

type VerifiedStudentToken = {
  uid: string;
};

type SaveSubmissionDependencies = {
  verifyIdToken: (idToken: string) => Promise<VerifiedStudentToken>;
  classroomExists: (classCode: string) => Promise<boolean>;
  membershipExists: (classCode: string, uid: string) => Promise<boolean>;
  writeSubmission: (
    classCode: string,
    submissionId: string,
    document: FirestoreSubmissionDocument,
  ) => Promise<void>;
};

type FirestoreSubmissionDocument = {
  classroomId: string;
  studentUid: string;
  studentDisplayName: string;
  anonymousStudentId: string;
  activityId: string;
  snapshot: Record<string, unknown>;
  status: 'submitted';
  submittedAt: string;
  updatedAt: string;
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
  '서버 제출함 저장 설정이 아직 준비되지 않았습니다. 현재 활동 결과는 브라우저 제출함에 보관됩니다.';

const UNSAFE_SUBMISSION_KEYS = new Set([
  'developerLogs',
  'rawMolBlock',
  'rawSdf',
  'teacherFeedback',
]);

export default {
  async fetch(request: Request): Promise<Response> {
    return saveSubmissionFetch(request);
  },
};

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request): Promise<Response> {
  return saveSubmissionFetch(request);
}

export async function saveSubmissionFetch(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return OPTIONS();
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        ok: false,
        status: 'invalid_request',
        studentMessage: '활동 결과 제출 요청 방식이 올바르지 않습니다.',
        developerMessage: `saveSubmission rejected method: ${request.method}`,
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
        studentMessage: '활동 결과 제출 요청을 읽지 못했습니다.',
        developerMessage: 'saveSubmission request body is not valid JSON.',
      },
      400,
    );
  }

  try {
    return handleSaveSubmissionBody(body, createFirebaseAdminDependencies());
  } catch (error) {
    console.error('[save-submission] admin setup failed', {
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_not_configured',
        studentMessage: SERVER_NOT_CONFIGURED_MESSAGE,
        developerMessage: `saveSubmission admin setup failed: ${getErrorMessage(error)}`,
      },
      503,
    );
  }
}

export async function handleSaveSubmissionBody(
  body: unknown,
  dependencies: SaveSubmissionDependencies,
): Promise<Response> {
  const parsed = parseSaveSubmissionRequest(body);

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
  const classCode = request.submission.classCode;

  try {
    const decodedToken = await dependencies.verifyIdToken(request.idToken);

    if (!decodedToken.uid) {
      return jsonResponse(
        {
          ok: false,
          status: 'unauthorized',
          classCode,
          studentMessage: '학생 제출 인증을 확인하지 못했습니다.',
          developerMessage: 'saveSubmission verified token did not include uid.',
        },
        401,
      );
    }

    if (!(await dependencies.classroomExists(classCode))) {
      return jsonResponse(
        {
          ok: false,
          status: 'classroom_not_found',
          classCode,
          studentMessage:
            '수업방을 찾지 못해 서버 제출함에 저장하지 못했습니다. 수업코드를 다시 확인해 주세요.',
          developerMessage: `saveSubmission classroom not found: ${classCode}`,
        },
        404,
      );
    }

    if (!(await dependencies.membershipExists(classCode, decodedToken.uid))) {
      return jsonResponse(
        {
          ok: false,
          status: 'membership_required',
          classCode,
          studentMessage:
            '서버 수업방 입장 확인이 필요합니다. 학생 화면에서 수업코드와 입장 확인코드로 다시 입장한 뒤 제출해 주세요.',
          developerMessage: `saveSubmission membership missing: classCode=${classCode}, uid=${decodedToken.uid}`,
        },
        403,
      );
    }

    const document = buildFirestoreSubmissionDocument({
      submission: request.submission,
      firebaseUid: decodedToken.uid,
    });

    await dependencies.writeSubmission(classCode, request.submission.id, document);

    return jsonResponse(
      {
        ok: true,
        status: 'saved',
        classCode,
        submission: request.submission,
        studentMessage:
          '활동 결과를 서버 제출함에도 저장했습니다. 교사는 해당 수업방 제출 목록에서 확인할 수 있습니다.',
        developerMessage: `saveSubmission saved: classCode=${classCode}, submission=${request.submission.id}, uid=${decodedToken.uid}`,
      },
      200,
    );
  } catch (error) {
    console.error('[save-submission] request failed', {
      classCode,
      submissionId: request.submission.id,
      message: getErrorMessage(error),
    });

    return jsonResponse(
      {
        ok: false,
        status: 'server_error',
        classCode,
        studentMessage:
          '서버 제출함 저장 중 문제가 발생했습니다. 현재 활동 결과는 브라우저 제출함에 보관됩니다.',
        developerMessage: `saveSubmission failed: ${getErrorMessage(error)}`,
      },
      500,
    );
  }
}

export function parseSaveSubmissionRequest(
  body: unknown,
):
  | { ok: true; data: SaveSubmissionRequest }
  | { ok: false; studentMessage: string; developerMessage: string } {
  if (!body || typeof body !== 'object') {
    return invalidRequest('request body is not an object');
  }

  const candidate = body as Record<string, unknown>;
  const idToken = sanitizeString(candidate.idToken, 8192);
  const submission = normalizeSubmission(candidate.submission);

  if (!idToken) {
    return invalidRequest('idToken is missing');
  }

  if (!submission) {
    return invalidRequest('submission is invalid or includes unsafe fields');
  }

  return {
    ok: true,
    data: {
      idToken,
      submission,
    },
  };
}

export function buildFirestoreSubmissionDocument(input: {
  submission: ActivitySubmissionPayload;
  firebaseUid: string;
}): FirestoreSubmissionDocument {
  const snapshot = removeUndefinedValues(input.submission.snapshot) as Record<
    string,
    unknown
  >;
  const activityId = sanitizeString(snapshot.activityId, 120) || 'free-draw';

  return {
    classroomId: input.submission.classCode,
    studentUid: input.firebaseUid,
    studentDisplayName: input.submission.studentDisplayName || '익명 학생',
    anonymousStudentId:
      input.submission.anonymousStudentId || input.firebaseUid,
    activityId,
    snapshot,
    status: 'submitted',
    submittedAt: input.submission.submittedAt,
    updatedAt: input.submission.updatedAt,
  };
}

function createFirebaseAdminDependencies(): SaveSubmissionDependencies {
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
    writeSubmission: async (classCode, submissionId, document) => {
      await db
        .collection('classrooms')
        .doc(classCode)
        .collection('submissions')
        .doc(submissionId)
        .set(document);
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

function normalizeSubmission(value: unknown): ActivitySubmissionPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  if (containsUnsafeSubmissionKeys(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const id = sanitizeString(candidate.id, 120);
  const submittedAt = sanitizeString(candidate.submittedAt, 64);
  const updatedAt = sanitizeString(candidate.updatedAt, 64);
  const classCode = normalizeJoinClassCode(candidate.classCode);
  const snapshot = candidate.snapshot;

  if (
    !id ||
    !submittedAt ||
    !updatedAt ||
    !classCode ||
    candidate.status !== 'submitted' ||
    !snapshot ||
    typeof snapshot !== 'object' ||
    Array.isArray(snapshot) ||
    containsUnsafeSubmissionKeys(snapshot)
  ) {
    return null;
  }

  return removeUndefinedValues({
    id,
    submittedAt,
    updatedAt,
    classCode,
    studentDisplayName:
      sanitizeStudentText(candidate.studentDisplayName, 24) || undefined,
    anonymousStudentId:
      sanitizeStudentText(candidate.anonymousStudentId, 64) || undefined,
    snapshot,
    status: 'submitted' as const,
  }) as ActivitySubmissionPayload;
}

function containsUnsafeSubmissionKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsUnsafeSubmissionKeys);
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.entries(value as Record<string, unknown>).some(
    ([key, itemValue]) =>
      UNSAFE_SUBMISSION_KEYS.has(key) ||
      containsUnsafeSubmissionKeys(itemValue),
  );
}

function normalizeJoinClassCode(value: unknown): string {
  return typeof value === 'string'
    ? value
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/\s+/g, '-')
        .toUpperCase()
        .slice(0, 24)
    : '';
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

function removeUndefinedValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedValues);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined)
      .map(([key, itemValue]) => [key, removeUndefinedValues(itemValue)]),
  );
}

function invalidRequest(reason: string) {
  return {
    ok: false as const,
    studentMessage: '활동 결과 제출 요청 정보를 다시 확인해 주세요.',
    developerMessage: `saveSubmission invalid request: ${reason}`,
  };
}

function jsonResponse(
  payload: SaveSubmissionApiPayload,
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
