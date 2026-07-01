import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '../../config/firebaseConfig';

export type FirebaseAuthFailureStatus = 'not_configured' | 'auth_error';

export type FirebaseAuthUserResult = {
  ok: true;
  uid: string;
  displayName?: string;
  email?: string;
  providerId?: string;
  isAnonymous: boolean;
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

function authNotConfiguredResult(): FirebaseAuthFailureResult {
  return {
    ok: false,
    status: 'not_configured',
    studentMessage: '인증 설정이 없어 현재 브라우저에서만 임시로 진행합니다.',
    developerMessage:
      'Firebase Web App config is missing. Auth call was skipped.',
  };
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

export async function signInStudentAnonymously(): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();

  if (!auth) {
    return authNotConfiguredResult();
  }

  try {
    const credential = await signInAnonymously(auth);

    return userResult(credential.user, 'anonymous');
  } catch (error) {
    return authErrorResult(
      error,
      '익명 수업 입장을 준비하지 못했습니다. 교사에게 알려 주세요.',
      'Firebase anonymous sign-in',
    );
  }
}

export async function signInTeacherWithGooglePopup(): Promise<FirebaseAuthResult> {
  const auth = getFirebaseAuth();

  if (!auth) {
    return authNotConfiguredResult();
  }

  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);

    return userResult(credential.user, 'google.com');
  } catch (error) {
    return authErrorResult(
      error,
      '교사용 Google 로그인을 완료하지 못했습니다.',
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

  const auth = getFirebaseAuth();

  if (!auth) {
    return authNotConfiguredResult();
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    return userResult(credential.user, 'password');
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
