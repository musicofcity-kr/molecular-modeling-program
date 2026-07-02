export type UserRole = 'student' | 'teacher';

export type AppRoute =
  | 'home'
  | 'student'
  | 'student-workbench'
  | 'teacher'
  | 'teacher-dashboard';

export type TeacherAuthProvider = 'firebase-google' | 'firebase-email';

export type StudentAuthProvider = 'local-only' | 'firebase-anonymous';

export type StudentAuthStatus =
  | 'local_only'
  | 'authenticated'
  | 'auth_unavailable';

export type ClassroomJoinStatus =
  | 'local_session_only'
  | 'deferred_until_trusted_endpoint'
  | 'joined';

export type TeacherAuthorizationStatus =
  | 'not_checked'
  | 'pending_custom_claim'
  | 'authorized';

export interface StudentSession {
  role: 'student';
  classCode: string;
  displayName: string;
  anonymousStudentId: string;
  startedAt: string;
  idToken?: string;
  firebaseUid?: string;
  authProvider?: StudentAuthProvider;
  authStatus?: StudentAuthStatus;
  classroomJoinStatus?: ClassroomJoinStatus;
  classroomJoinMessage?: string;
  activityTemplateIds?: string[];
}

export interface TeacherSession {
  role: 'teacher';
  uid: string;
  idToken?: string;
  displayName?: string;
  email?: string;
  authProvider: TeacherAuthProvider;
  signedInAt: string;
  teacherAuthorizationStatus?: TeacherAuthorizationStatus;
}

export type UserSession = StudentSession | TeacherSession;

export type StudentEntryInput = {
  classCode: string;
  joinCode?: string;
  nickname?: string;
};

export type StudentEntryValidationResult =
  | {
      ok: true;
      classCode: string;
      joinCode: string;
      displayName: string;
    }
  | {
      ok: false;
      studentMessage: string;
    };

export function normalizeClassCode(value: string): string {
  return value.trim().replace(/\s+/g, '-').toUpperCase().slice(0, 24);
}

export function normalizeStudentDisplayName(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
}

export function normalizeStudentJoinCode(value: string | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, '').toUpperCase().slice(0, 32);
}

export function validateStudentEntryInput(
  input: StudentEntryInput,
): StudentEntryValidationResult {
  const classCode = normalizeClassCode(input.classCode);
  const joinCode = normalizeStudentJoinCode(input.joinCode);
  const displayName = normalizeStudentDisplayName(input.nickname);

  if (!classCode) {
    return {
      ok: false,
      studentMessage: '수업코드를 입력해 주세요.',
    };
  }

  if (!joinCode) {
    return {
      ok: false,
      studentMessage: '입장 확인코드를 입력해 주세요.',
    };
  }

  return {
    ok: true,
    classCode,
    joinCode,
    displayName: displayName || '익명 학생',
  };
}

export function resolveTeacherAuthorizationStatus(
  claims: Record<string, unknown> | undefined,
): TeacherAuthorizationStatus {
  if (!claims) {
    return 'not_checked';
  }

  return claims.teacher === true || claims.role === 'teacher'
    ? 'authorized'
    : 'pending_custom_claim';
}

export function isTeacherAuthorized(
  session: UserSession | null | undefined,
): boolean {
  return (
    session?.role === 'teacher' &&
    session.teacherAuthorizationStatus === 'authorized'
  );
}
