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

export type TeacherAuthorizationStatus =
  | 'not_checked'
  | 'pending_custom_claim';

export interface StudentSession {
  role: 'student';
  classCode: string;
  displayName: string;
  anonymousStudentId: string;
  startedAt: string;
  firebaseUid?: string;
  authProvider?: StudentAuthProvider;
  authStatus?: StudentAuthStatus;
}

export interface TeacherSession {
  role: 'teacher';
  uid: string;
  displayName?: string;
  email?: string;
  authProvider: TeacherAuthProvider;
  signedInAt: string;
  teacherAuthorizationStatus?: TeacherAuthorizationStatus;
}

export type UserSession = StudentSession | TeacherSession;

export type StudentEntryInput = {
  classCode: string;
  nickname?: string;
};

export type StudentEntryValidationResult =
  | {
      ok: true;
      classCode: string;
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

export function validateStudentEntryInput(
  input: StudentEntryInput,
): StudentEntryValidationResult {
  const classCode = normalizeClassCode(input.classCode);
  const displayName = normalizeStudentDisplayName(input.nickname);

  if (!classCode) {
    return {
      ok: false,
      studentMessage: '수업코드를 입력해 주세요.',
    };
  }

  return {
    ok: true,
    classCode,
    displayName: displayName || '익명 학생',
  };
}
