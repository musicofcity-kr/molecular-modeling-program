import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseFirestore } from '../../config/firebaseConfig';
import type { ActivityTemplate } from '../../types/activity';
import type { ActivitySubmission, TeacherFeedbackDraft } from '../../types/feedback';
import {
  buildJoinCodeHash,
  normalizeJoinClassCode,
} from './classroomJoinCode';

export type ClassroomDraft = {
  title: string;
  classCode: string;
  joinCode: string;
  activityTemplateIds: string[];
};

export type ActivitySubmissionDraft = {
  classCode: string;
  anonymousStudentId: string;
  activityTemplateId: string;
  activityTitle: string;
  createdAt: string;
};

export type ClassroomRepositoryStatus =
  | 'deferred_until_rules_ready'
  | 'firestore_ready'
  | 'not_configured';

export type ClassroomRepositoryOutcome<T> =
  | {
      ok: true;
      data: T;
      studentMessage: string;
      developerLogs: string[];
    }
  | {
      ok: false;
      data: T;
      studentMessage: string;
      developerLogs: string[];
    };

export interface ClassroomRepository {
  status: ClassroomRepositoryStatus;
  createClassroomDraft: (
    draft: ClassroomDraft,
    teacherUid?: string,
  ) => Promise<ClassroomRepositoryOutcome<{ classCode: string }>>;
  listActivityTemplates: () => Promise<ActivityTemplate[]>;
  saveSubmissionDraft: (
    draft: ActivitySubmissionDraft,
  ) => Promise<ClassroomRepositoryOutcome<ActivitySubmissionDraft>>;
}

export const FIRESTORE_DEFERRED_MESSAGE =
  'Firestore 저장은 Auth와 Security Rules 설계가 끝난 뒤 활성화합니다.';

export const FIRESTORE_NOT_CONFIGURED_MESSAGE =
  'Firebase 설정이 없어 서버 제출함을 사용할 수 없습니다.';

export const FIRESTORE_MEMBERSHIP_REQUIRED_MESSAGE =
  '서버 제출함은 수업방 입장 확인이 끝난 학생만 사용할 수 있습니다. 현재 활동 결과는 브라우저 제출함에 보관됩니다.';

export const FIRESTORE_SUBMISSION_TIMEOUT_MESSAGE =
  '서버 제출함 응답이 지연되고 있습니다. 현재 활동 결과는 브라우저 제출함에 보관했습니다. 네트워크 또는 수업방 입장 확인을 점검한 뒤 다시 제출해 주세요.';

export const DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS = 8000;

type FirestoreRepositoryOptions = {
  db?: Firestore | null;
  now?: () => string;
  writeTimeoutMs?: number;
};

const FIRESTORE_WRITE_TIMEOUT = Symbol('FIRESTORE_WRITE_TIMEOUT');

export type ClassroomDocument = {
  ownerTeacherUid: string;
  teacherUids: Record<string, true>;
  title: string;
  joinCodeHash: string;
  joinEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClassroomPublicInfoDocument = {
  title: string;
  currentActivityTitle?: string;
  updatedAt: string;
};

export type PublishedActivityTemplateDocument = {
  title: string;
  targetMoleculeName: string;
  published: true;
  activityData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type FirestoreSubmissionDocument = {
  classroomId: string;
  studentUid: string;
  studentDisplayName: string;
  anonymousStudentId: string;
  activityId: string;
  snapshot: Record<string, unknown>;
  status: ActivitySubmission['status'];
  submittedAt: string;
  updatedAt: string;
  teacherFeedback?: TeacherFeedbackDraft;
  feedbackReturnedAt?: string;
};

export function createDeferredClassroomRepository(
  templates: ActivityTemplate[],
): ClassroomRepository {
  return {
    status: 'deferred_until_rules_ready',
    createClassroomDraft: async () => ({
      ok: false,
      data: { classCode: '' },
      studentMessage: FIRESTORE_DEFERRED_MESSAGE,
      developerLogs: [FIRESTORE_DEFERRED_MESSAGE],
    }),
    listActivityTemplates: async () => templates,
    saveSubmissionDraft: async (draft) => ({
      ok: false,
      data: draft,
      studentMessage: FIRESTORE_DEFERRED_MESSAGE,
      developerLogs: [FIRESTORE_DEFERRED_MESSAGE],
    }),
  };
}

export function buildClassroomDocument(input: {
  draft: ClassroomDraft;
  teacherUid: string;
  now: string;
}): ClassroomDocument {
  return {
    ownerTeacherUid: input.teacherUid,
    teacherUids: {
      [input.teacherUid]: true,
    },
    title: input.draft.title.trim().slice(0, 80),
    joinCodeHash: buildJoinCodeHash({
      classCode: input.draft.classCode,
      joinCode: input.draft.joinCode,
    }),
    joinEnabled: true,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function buildClassroomPublicInfoDocument(input: {
  draft: ClassroomDraft;
  templates: ActivityTemplate[];
  now: string;
}): ClassroomPublicInfoDocument {
  const firstTemplate = input.templates.find((template) =>
    input.draft.activityTemplateIds.includes(template.id),
  );

  return removeUndefinedValues({
    title: input.draft.title.trim().slice(0, 80),
    currentActivityTitle: firstTemplate?.title,
    updatedAt: input.now,
  }) as ClassroomPublicInfoDocument;
}

export function buildPublishedActivityTemplateDocument(input: {
  template: ActivityTemplate;
  now: string;
}): PublishedActivityTemplateDocument {
  return removeUndefinedValues({
    title: input.template.title,
    targetMoleculeName: input.template.targetMoleculeName,
    published: true as const,
    activityData: {
      id: input.template.id,
      targetSmiles: input.template.targetSmiles,
      learningGoal: input.template.learningGoal,
      prompt: input.template.prompt,
      recommendedExampleId: input.template.recommendedExampleId,
      requiresVsepr: input.template.requiresVsepr,
    },
    createdAt: input.now,
    updatedAt: input.now,
  }) as PublishedActivityTemplateDocument;
}

export function buildFirestoreSubmissionDocument(input: {
  submission: ActivitySubmission;
  firebaseUid: string;
}): FirestoreSubmissionDocument {
  const classCode = normalizeFirestoreClassCode(input.submission.classCode ?? '');
  const document = removeUndefinedValues({
    classroomId: classCode,
    studentUid: input.firebaseUid,
    studentDisplayName: (input.submission.studentDisplayName ?? '익명 학생')
      .trim()
      .slice(0, 24),
    anonymousStudentId: (
      input.submission.anonymousStudentId ?? input.firebaseUid
    )
      .trim()
      .slice(0, 64),
    activityId: input.submission.snapshot.activityId ?? 'free-draw',
    snapshot: removeUndefinedValues(input.submission.snapshot),
    status: input.submission.status,
    submittedAt: input.submission.submittedAt,
    updatedAt: input.submission.updatedAt,
  });

  return document as FirestoreSubmissionDocument;
}

export function buildFirestoreFeedbackUpdate(input: {
  feedback: TeacherFeedbackDraft;
  status: Extract<ActivitySubmission['status'], 'feedback_draft' | 'feedback_returned'>;
  now: string;
}): Pick<
  FirestoreSubmissionDocument,
  'status' | 'updatedAt' | 'teacherFeedback' | 'feedbackReturnedAt'
> {
  return removeUndefinedValues({
    status: input.status,
    updatedAt: input.now,
    teacherFeedback: {
      ...input.feedback,
      updatedAt: input.now,
    },
    feedbackReturnedAt:
      input.status === 'feedback_returned' ? input.now : undefined,
  }) as Pick<
    FirestoreSubmissionDocument,
    'status' | 'updatedAt' | 'teacherFeedback' | 'feedbackReturnedAt'
  >;
}

export async function createClassroomInFirestore(
  draft: ClassroomDraft,
  teacherUid: string | undefined,
  templates: ActivityTemplate[],
  options: FirestoreRepositoryOptions = {},
): Promise<ClassroomRepositoryOutcome<{ classCode: string }>> {
  const db = options.db ?? getFirebaseFirestore();
  const now = options.now?.() ?? new Date().toISOString();
  const selectedTemplates = templates.filter((template) =>
    draft.activityTemplateIds.includes(template.id),
  );
  const classCode = normalizeFirestoreClassCode(draft.classCode);
  const title = draft.title.trim();

  if (!db) {
    return failure({ classCode }, FIRESTORE_NOT_CONFIGURED_MESSAGE, [
      'createClassroom skipped: Firebase Firestore is not configured.',
    ]);
  }

  if (!teacherUid) {
    return failure({ classCode }, '교사 로그인 정보가 없어 수업방을 만들 수 없습니다.', [
      'createClassroom skipped: teacher UID is missing.',
    ]);
  }

  if (!classCode || !title || !draft.joinCode.trim() || selectedTemplates.length === 0) {
    return failure(
      { classCode },
      '수업명, 수업코드, 사용할 활동을 모두 확인해 주세요.',
      [
        `createClassroom invalid input: classCode=${classCode}, titleLength=${title.length}, joinCode=${draft.joinCode ? 'present' : 'missing'}, templates=${selectedTemplates.length}`,
      ],
    );
  }

  const normalizedDraft = {
    ...draft,
    classCode,
    title,
    activityTemplateIds: selectedTemplates.map((template) => template.id),
  };

  try {
    await setDoc(
      doc(db, 'classrooms', classCode),
      buildClassroomDocument({
        draft: normalizedDraft,
        teacherUid,
        now,
      }),
    );
    await setDoc(
      doc(db, 'classrooms', classCode, 'public', 'info'),
      buildClassroomPublicInfoDocument({
        draft: normalizedDraft,
        templates: selectedTemplates,
        now,
      }),
    );
    await Promise.all(
      selectedTemplates.map((template) =>
        setDoc(
          doc(db, 'classrooms', classCode, 'activityTemplates', template.id),
          buildPublishedActivityTemplateDocument({ template, now }),
        ),
      ),
    );

    return {
      ok: true,
      data: { classCode },
      studentMessage:
        '수업방을 만들었습니다. 학생에게 수업코드와 입장 확인코드를 함께 안내해 주세요.',
      developerLogs: [
        `Created classroom ${classCode}`,
        `Published activity templates: ${selectedTemplates.map((item) => item.id).join(', ')}`,
      ],
    };
  } catch (error) {
    return failure({ classCode }, '수업방을 만들지 못했습니다. 교사 권한과 Firestore 규칙을 확인해 주세요.', [
      `createClassroom failed: ${getErrorMessage(error)}`,
    ]);
  }
}

export async function saveSubmissionToFirestore(
  submission: ActivitySubmission,
  firebaseUid: string | undefined,
  options: FirestoreRepositoryOptions = {},
): Promise<ClassroomRepositoryOutcome<ActivitySubmission>> {
  const db = options.db ?? getFirebaseFirestore();
  const writeTimeoutMs =
    options.writeTimeoutMs ?? DEFAULT_FIRESTORE_WRITE_TIMEOUT_MS;

  if (!db) {
    return failure(submission, FIRESTORE_NOT_CONFIGURED_MESSAGE, [
      'saveSubmission skipped: Firebase Firestore is not configured.',
    ]);
  }

  if (!firebaseUid || !submission.classCode) {
    return failure(submission, FIRESTORE_MEMBERSHIP_REQUIRED_MESSAGE, [
      `saveSubmission skipped: firebaseUid=${firebaseUid ?? 'missing'}, classCode=${submission.classCode ?? 'missing'}`,
    ]);
  }

  const document = buildFirestoreSubmissionDocument({ submission, firebaseUid });

  try {
    const writeResult = await resolveWithTimeout(
      setDoc(
        doc(
          db,
          'classrooms',
          normalizeFirestoreClassCode(submission.classCode),
          'submissions',
          submission.id,
        ),
        document,
      ),
      writeTimeoutMs,
    );

    if (writeResult === FIRESTORE_WRITE_TIMEOUT) {
      return failure(submission, FIRESTORE_SUBMISSION_TIMEOUT_MESSAGE, [
        `saveSubmission timed out after ${writeTimeoutMs}ms: classroom=${normalizeFirestoreClassCode(
          submission.classCode,
        )}, submission=${submission.id}`,
      ]);
    }

    return {
      ok: true,
      data: submission,
      studentMessage:
        '활동 결과를 서버 제출함에도 저장했습니다. 교사는 해당 수업방 제출 목록에서 확인할 수 있습니다.',
      developerLogs: [
        `Saved Firestore submission ${submission.id} in classroom ${submission.classCode}`,
      ],
    };
  } catch (error) {
    return failure(submission, FIRESTORE_MEMBERSHIP_REQUIRED_MESSAGE, [
      `saveSubmission failed: ${getErrorMessage(error)}`,
    ]);
  }
}

export async function loadClassroomSubmissionsFromFirestore(
  classCode: string,
  options: FirestoreRepositoryOptions = {},
): Promise<ClassroomRepositoryOutcome<ActivitySubmission[]>> {
  const db = options.db ?? getFirebaseFirestore();
  const normalizedClassCode = normalizeFirestoreClassCode(classCode);

  if (!db) {
    return failure([], FIRESTORE_NOT_CONFIGURED_MESSAGE, [
      'loadSubmissions skipped: Firebase Firestore is not configured.',
    ]);
  }

  if (!normalizedClassCode) {
    return failure([], '제출 목록을 불러올 수업코드를 입력해 주세요.', [
      'loadSubmissions skipped: class code is empty.',
    ]);
  }

  try {
    const snapshot = await getDocs(
      collection(db, 'classrooms', normalizedClassCode, 'submissions'),
    );
    const submissions = snapshot.docs
      .map((documentSnapshot) =>
        mapFirestoreSubmissionDocument(documentSnapshot.id, documentSnapshot.data()),
      )
      .filter((submission): submission is ActivitySubmission => Boolean(submission));

    return {
      ok: true,
      data: submissions,
      studentMessage: `서버 제출함에서 ${submissions.length}개의 제출 자료를 불러왔습니다.`,
      developerLogs: [
        `Loaded Firestore submissions: classroom=${normalizedClassCode}, count=${submissions.length}`,
      ],
    };
  } catch (error) {
    return failure([], '제출 목록을 불러오지 못했습니다. 교사 권한과 수업코드를 확인해 주세요.', [
      `loadSubmissions failed: ${getErrorMessage(error)}`,
    ]);
  }
}

export async function updateSubmissionFeedbackInFirestore(
  submission: ActivitySubmission,
  feedback: TeacherFeedbackDraft,
  status: Extract<ActivitySubmission['status'], 'feedback_draft' | 'feedback_returned'>,
  options: FirestoreRepositoryOptions = {},
): Promise<ClassroomRepositoryOutcome<ActivitySubmission>> {
  const db = options.db ?? getFirebaseFirestore();
  const now = options.now?.() ?? new Date().toISOString();

  if (!db) {
    return failure(submission, FIRESTORE_NOT_CONFIGURED_MESSAGE, [
      'updateFeedback skipped: Firebase Firestore is not configured.',
    ]);
  }

  if (!submission.classCode) {
    return failure(submission, '수업코드가 없어 서버 피드백을 저장하지 못했습니다.', [
      'updateFeedback skipped: classCode is missing.',
    ]);
  }

  try {
    await updateDoc(
      doc(
        db,
        'classrooms',
        normalizeFirestoreClassCode(submission.classCode),
        'submissions',
        submission.id,
      ),
      buildFirestoreFeedbackUpdate({ feedback, status, now }),
    );

    return {
      ok: true,
      data: {
        ...submission,
        status,
        updatedAt: now,
        teacherFeedback: {
          ...feedback,
          updatedAt: now,
        },
        feedbackReturnedAt:
          status === 'feedback_returned' ? now : submission.feedbackReturnedAt,
      },
      studentMessage:
        status === 'feedback_returned'
          ? '서버 제출함에도 교사 피드백을 전달했습니다.'
          : '서버 제출함에도 피드백 초안을 저장했습니다.',
      developerLogs: [
        `Updated Firestore feedback: classroom=${submission.classCode}, submission=${submission.id}, status=${status}`,
      ],
    };
  } catch (error) {
    return failure(submission, '서버 제출함에 피드백을 저장하지 못했습니다.', [
      `updateFeedback failed: ${getErrorMessage(error)}`,
    ]);
  }
}

function mapFirestoreSubmissionDocument(
  id: string,
  data: Record<string, unknown>,
): ActivitySubmission | null {
  const snapshot = data.snapshot;

  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }

  if (
    data.status !== 'submitted' &&
    data.status !== 'feedback_draft' &&
    data.status !== 'feedback_returned'
  ) {
    return null;
  }

  return removeUndefinedValues({
    id,
    submittedAt:
      typeof data.submittedAt === 'string' ? data.submittedAt : undefined,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    classCode:
      typeof data.classroomId === 'string' ? data.classroomId : undefined,
    studentDisplayName:
      typeof data.studentDisplayName === 'string'
        ? data.studentDisplayName
        : undefined,
    anonymousStudentId:
      typeof data.anonymousStudentId === 'string'
        ? data.anonymousStudentId
        : undefined,
    snapshot,
    status: data.status,
    teacherFeedback:
      data.teacherFeedback && typeof data.teacherFeedback === 'object'
        ? data.teacherFeedback
        : undefined,
    feedbackReturnedAt:
      typeof data.feedbackReturnedAt === 'string'
        ? data.feedbackReturnedAt
        : undefined,
  }) as ActivitySubmission;
}

function normalizeFirestoreClassCode(value: string): string {
  return normalizeJoinClassCode(value);
}

async function resolveWithTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T | typeof FIRESTORE_WRITE_TIMEOUT> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return operation;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      operation,
      new Promise<typeof FIRESTORE_WRITE_TIMEOUT>((resolve) => {
        timeoutId = setTimeout(() => {
          resolve(FIRESTORE_WRITE_TIMEOUT);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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

function failure<T>(
  data: T,
  studentMessage: string,
  developerLogs: string[],
): ClassroomRepositoryOutcome<T> {
  return {
    ok: false,
    data,
    studentMessage,
    developerLogs,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
