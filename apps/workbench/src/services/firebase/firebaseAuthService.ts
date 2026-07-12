import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../../config/firebaseConfig';
import {
  resolveTeacherAuthorizationStatus,
  type TeacherAuthorizationStatus,
} from '../../types/session';

export type FirebaseAuthFailureStatus = 'not_configured' | 'auth_error';

export type FirebaseAuthUserResult = {
  ok: true;
  uid: string;
  idToken?: string;
  displayName?: string;
  email?: string;
  providerId?: string;
  isAnonymous: boolean;
  teacherAuthorizationStatus?: TeacherAuthorizationStatus;
  developerMessage?: string;
};

export type FirebaseAuthFailureResult = {
  ok: false;
  status: FirebaseAuthFailureStatus;
  studentMessage: string;
  developerMessage: string;
  code?: string;
};

export type FirebaseAuthResult =
  | FirebaseAuthUserResult
  | FirebaseAuthFailureResult;

function authNotConfiguredResult(
  studentMessage = '인증 설정이 없어 현재 브라우저에서만 임시로 진행합니다.',
): FirebaseAuthFailureResult {
  return {
    ok: false,
    status: 'not_configured',
    studentMessage,
    developerMessage:
      'Firebase Web App config is missing. Auth call was skipped.',
  };
}

function getGoogleSignInStudentMessage(code?: string): string {
  switch (code) {
    case 'auth/unauthorized-domain':
      return '현재 접속 주소가 Firebase 승인 도메인에 등록되지 않았습니다. 관리자에게 알려 주세요.';
    case 'auth/popup-blocked':
      return '브라우저가 Google 로그인 팝업을 차단했습니다. 팝업을 허용한 뒤 다시 시도해 주세요.';
    case 'auth/popup-closed-by-user':
      return 'Google 로그인 창이 닫혔습니다. 다시 시도해 주세요.';
    case 'auth/operation-not-allowed':
      return 'Firebase에서 Google 로그인이 활성화되지 않았습니다. 관리자에게 알려 주세요.';
    default:
      return '교사용 Google 로그인을 완료하지 못했습니다.';
  }
}

function getAuthErrorDetails(error: unknown): {
  code?: string;
  message: string;
} {
  if (error instanceof Error) {
    const maybeCode = 'code' in error ? String(error.code) : undefined;

    return {
      code: maybeCode,
      message: error.message,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { code?: unknown; message?: unknown };

    return {
      code:
        typeof maybeError.code === 'string' ? maybeError.code : undefined,
      message:
        typeof maybeError.message === 'string'
          ? maybeError.message
          : String(error),
    };
  }

  return { message: String(error) };
}

function authErrorResult(
  error: unknown,
  studentMessage: string,
  operation: string,
): FirebaseAuthFailureResult {
  const details = getAuthErrorDetails(error);

  return {
    ok: false,
    status: 'auth_error',
    studentMessage,
    developerMessage: `${operation} failed: ${details.message}`,
    code: details.code,
  };
}

function userResult(user: User, providerId?: string): FirebaseAuthUserResult {
  return {
    ok: true,
    uid: user.uid,
    displayName: user.displayName ?? undefined,
    email: user.email ?? undefined,
    providerId,
    isAnonymous: user.isAnonymous,
  };
}

function isE2eAuthStubEnabled(): boolean {
  return import.meta.env.MODE === 'e2e';
}

function e2eStudentAuthResult(): FirebaseAuthUserResult {
  return {
    ok: true,
    uid: 'e2e-student-uid',
    idToken: 'e2e-student-id-token',
    displayName: 'E2E 학생',
    providerId: 'e2e-anonymous',
    isAnonymous: true,
  };
}

function e2eTeacherAuthResult(providerId: string): FirebaseAuthUserResult {
  return {
    ok: true,
    uid: 'e2e-teacher-uid',
    idToken: 'e2e-teacher-id-token',
    displayName: 'E2E 교사',
    email: 'teacher-e2e@example.com',
    providerId,
    isAnonymous: false,
    teacherAuthorizationStatus: 'authorized',
    developerMessage:
      'E2E mode Firebase auth stub returned an authorized teacher session.',
  };
}

async function studentUserResult(
  user: User,
  providerId?: string,
): Promise<FirebaseAuthUserResult> {
  return {
    ...userResult(user, providerId),
    idToken: await user.getIdToken(),
  };
}

async function teacherUserResult(
  user: User,
  providerId?: string,
): Promise<FirebaseAuthUserResult> {
  const baseResult = userResult(user, providerId);

  try {
    const tokenResult = await user.getIdTokenResult();

    return {
      ...baseResult,
      idToken: await user.getIdToken(),
      teacherAuthorizationStatus: resolveTeacherAuthorizationStatus(
        tokenResult.claims,
      ),
    };
  } catch (error) {
    const details = getAuthErrorDetails(error);

    return {
      ...baseResult,
      teacherAuthorizationStatus: 'not_checked',
      developerMessage: `Firebase teacher custom claim check failed: ${details.message}`,
    };
  }
}

export async function signInStudentAnonymously(): Promise<FirebaseAuthResult> {
  if (isE2eAuthStubEnabled()) {
    return e2eStudentAuthResult();
  }

  const auth = getFirebaseAuth();

  if (!auth) {
    return authNotConfiguredResult();
  }

  try {
    const credential = await signInAnonymously(auth);

    return studentUserResult(credential.user, 'anonymous');
  } catch (error) {
    return authErrorResult(
      error,
      '익명 수업 입장을 준비하지 못했습니다. 교사에게 알려 주세요.',
      'Firebase anonymous sign-in',
    );
  }
}

export async function signInTeacherWithGooglePopup(): Promise<FirebaseAuthResult> {
  if (isE2eAuthStubEnabled()) {
    return e2eTeacherAuthResult('e2e-google');
  }

  const auth = getFirebaseAuth();

  if (!auth) {
    return authNotConfiguredResult(
      'Firebase 인증 설정이 없어 교사용 Google 로그인을 사용할 수 없습니다. 관리자에게 알려 주세요.',
    );
  }

  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);

    return teacherUserResult(credential.user, 'google.com');
  } catch (error) {
    const details = getAuthErrorDetails(error);

    return authErrorResult(
      error,
      getGoogleSignInStudentMessage(details.code),
      'Firebase Google sign-in',
    );
  }
}

export async function signInTeacherWithEmailPassword(input: {
  email: string;
  password: string;
}): Promise<FirebaseAuthResult> {
  const email = input.email.trim();
  const password = input.password;

  if (!email || !password) {
    return {
      ok: false,
      status: 'auth_error',
      studentMessage: '교사용 이메일과 비밀번호를 모두 입력해 주세요.',
      developerMessage: 'Teacher email/password sign-in skipped: missing input.',
    };
  }

  if (isE2eAuthStubEnabled()) {
    return e2eTeacherAuthResult('e2e-password');
  }

  const auth = getFirebaseAuth();

  if (!auth) {
    return authNotConfiguredResult(
      'Firebase 인증 설정이 없어 교사용 이메일 로그인을 사용할 수 없습니다. 관리자에게 알려 주세요.',
    );
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    return teacherUserResult(credential.user, 'password');
  } catch (error) {
    return authErrorResult(
      error,
      '교사용 이메일 로그인을 완료하지 못했습니다.',
      'Firebase email/password sign-in',
    );
  }
}

export async function signOutFirebaseAuth(): Promise<void> {
  const auth = getFirebaseAuth();

  if (!auth) {
    return;
  }

  await signOut(auth);
}
