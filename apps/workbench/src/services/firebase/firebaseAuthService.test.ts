import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { getFirebaseAuth } from '../../config/firebaseConfig';
import {
  signInStudentAnonymously,
  signInTeacherWithEmailPassword,
  signInTeacherWithGooglePopup,
} from './firebaseAuthService';

vi.mock('../../config/firebaseConfig', () => ({
  getFirebaseAuth: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider() {
    return { providerId: 'google.com' };
  }),
  signInAnonymously: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

const firebaseAuthMock = { name: 'test-auth' };

function userFixture(overrides: Partial<{
  uid: string;
  displayName: string | null;
  email: string | null;
  isAnonymous: boolean;
  claims: Record<string, unknown>;
  tokenError: Error;
}> = {}) {
  return {
    uid: overrides.uid ?? 'uid-test',
    displayName: overrides.displayName ?? null,
    email: overrides.email ?? null,
    isAnonymous: overrides.isAnonymous ?? false,
    getIdTokenResult: vi.fn().mockImplementation(() => {
      if (overrides.tokenError) {
        return Promise.reject(overrides.tokenError);
      }

      return Promise.resolve({
        claims: overrides.claims ?? {},
      });
    }),
  };
}

describe('firebaseAuthService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('does not call Firebase Auth when web app config is missing', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(null);

    const result = await signInStudentAnonymously();

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({
      status: 'not_configured',
      developerMessage:
        'Firebase Web App config is missing. Auth call was skipped.',
    });
    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('maps anonymous student sign-in to a Firebase UID result', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(firebaseAuthMock as never);
    vi.mocked(signInAnonymously).mockResolvedValue({
      user: userFixture({
        uid: 'student-firebase-uid',
        isAnonymous: true,
      }),
    } as never);

    const result = await signInStudentAnonymously();

    expect(result).toMatchObject({
      ok: true,
      uid: 'student-firebase-uid',
      providerId: 'anonymous',
      isAnonymous: true,
    });
  });

  it('separates student and developer messages when anonymous auth fails', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(firebaseAuthMock as never);
    vi.mocked(signInAnonymously).mockRejectedValue(
      Object.assign(new Error('Anonymous provider is disabled.'), {
        code: 'auth/operation-not-allowed',
      }),
    );

    const result = await signInStudentAnonymously();

    expect(result).toMatchObject({
      ok: false,
      status: 'auth_error',
      studentMessage: '익명 수업 입장을 준비하지 못했습니다. 교사에게 알려 주세요.',
      developerMessage:
        'Firebase anonymous sign-in failed: Anonymous provider is disabled.',
      code: 'auth/operation-not-allowed',
    });
  });

  it('uses Google popup sign-in for teacher auth', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(firebaseAuthMock as never);
    vi.mocked(signInWithPopup).mockResolvedValue({
      user: userFixture({
        uid: 'teacher-google-uid',
        displayName: '테스트 교사',
        email: 'teacher@example.com',
        claims: { teacher: true },
      }),
    } as never);

    const result = await signInTeacherWithGooglePopup();

    expect(signInWithPopup).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      ok: true,
      uid: 'teacher-google-uid',
      displayName: '테스트 교사',
      email: 'teacher@example.com',
      providerId: 'google.com',
      teacherAuthorizationStatus: 'authorized',
    });
  });

  it('marks teacher sign-in as pending when custom claim is missing', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(firebaseAuthMock as never);
    vi.mocked(signInWithPopup).mockResolvedValue({
      user: userFixture({
        uid: 'teacher-no-claim',
        email: 'teacher@example.com',
      }),
    } as never);

    const result = await signInTeacherWithGooglePopup();

    expect(result).toMatchObject({
      ok: true,
      uid: 'teacher-no-claim',
      teacherAuthorizationStatus: 'pending_custom_claim',
    });
  });

  it('keeps teacher login successful but separates developer detail when claim check fails', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(firebaseAuthMock as never);
    vi.mocked(signInWithPopup).mockResolvedValue({
      user: userFixture({
        uid: 'teacher-token-error',
        email: 'teacher@example.com',
        tokenError: new Error('token refresh failed'),
      }),
    } as never);

    const result = await signInTeacherWithGooglePopup();

    expect(result).toMatchObject({
      ok: true,
      uid: 'teacher-token-error',
      teacherAuthorizationStatus: 'not_checked',
      developerMessage:
        'Firebase teacher custom claim check failed: token refresh failed',
    });
  });

  it('blocks teacher email sign-in when email or password is missing', async () => {
    const result = await signInTeacherWithEmailPassword({
      email: 'teacher@example.com',
      password: '',
    });

    expect(result).toMatchObject({
      ok: false,
      status: 'auth_error',
      studentMessage: '교사용 이메일과 비밀번호를 모두 입력해 주세요.',
    });
    expect(getFirebaseAuth).not.toHaveBeenCalled();
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('uses email/password sign-in for teacher auth', async () => {
    vi.mocked(getFirebaseAuth).mockReturnValue(firebaseAuthMock as never);
    vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: userFixture({
        uid: 'teacher-email-uid',
        email: 'teacher@example.com',
        claims: { role: 'teacher' },
      }),
    } as never);

    const result = await signInTeacherWithEmailPassword({
      email: ' teacher@example.com ',
      password: 'test-password',
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      firebaseAuthMock,
      'teacher@example.com',
      'test-password',
    );
    expect(result).toMatchObject({
      ok: true,
      uid: 'teacher-email-uid',
      email: 'teacher@example.com',
      providerId: 'password',
      teacherAuthorizationStatus: 'authorized',
    });
  });
});
