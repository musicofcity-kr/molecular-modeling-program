import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  StudentEntryInput,
  StudentSession,
  TeacherSession,
  UserSession,
} from '../types/session';
import { validateStudentEntryInput } from '../types/session';
import {
  signInStudentAnonymously,
  signInTeacherWithEmailPassword,
  signInTeacherWithGooglePopup,
  signOutFirebaseAuth,
} from '../services/firebase/firebaseAuthService';

type SessionActionResult = {
  ok: boolean;
  studentMessage?: string;
  developerMessage?: string;
};

type UserSessionContextValue = {
  session: UserSession | null;
  enterStudentSession: (input: StudentEntryInput) => Promise<SessionActionResult>;
  signInTeacherWithGoogle: () => Promise<SessionActionResult>;
  signInTeacherWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<SessionActionResult>;
  clearSession: () => void;
};

type UserSessionProviderProps = {
  children: ReactNode;
  initialSession?: UserSession | null;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

function createAnonymousId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `student-${crypto.randomUUID()}`;
  }

  return `student-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function UserSessionProvider({
  children,
  initialSession = null,
}: UserSessionProviderProps) {
  const [session, setSession] = useState<UserSession | null>(initialSession);

  const value = useMemo<UserSessionContextValue>(
    () => ({
      session,
      enterStudentSession: async (input) => {
        const validation = validateStudentEntryInput(input);

        if (!validation.ok) {
          return {
            ok: false,
            studentMessage: validation.studentMessage,
          };
        }

        const authResult = await signInStudentAnonymously();

        if (!authResult.ok && authResult.status === 'auth_error') {
          return {
            ok: false,
            studentMessage: authResult.studentMessage,
            developerMessage: authResult.developerMessage,
          };
        }

        const nextSession: StudentSession = {
          role: 'student',
          classCode: validation.classCode,
          displayName: validation.displayName,
          anonymousStudentId: createAnonymousId(),
          startedAt: new Date().toISOString(),
          firebaseUid: authResult.ok ? authResult.uid : undefined,
          authProvider: authResult.ok ? 'firebase-anonymous' : 'local-only',
          authStatus: authResult.ok ? 'authenticated' : 'local_only',
        };

        setSession(nextSession);

        return {
          ok: true,
          studentMessage: authResult.ok ? undefined : authResult.studentMessage,
          developerMessage: authResult.ok ? undefined : authResult.developerMessage,
        };
      },
      signInTeacherWithGoogle: async () => {
        const authResult = await signInTeacherWithGooglePopup();

        if (!authResult.ok) {
          return {
            ok: false,
            studentMessage: authResult.studentMessage,
            developerMessage: authResult.developerMessage,
          };
        }

        const nextSession: TeacherSession = {
          role: 'teacher',
          uid: authResult.uid,
          displayName: authResult.displayName,
          email: authResult.email,
          authProvider: 'firebase-google',
          signedInAt: new Date().toISOString(),
          teacherAuthorizationStatus: 'pending_custom_claim',
        };

        setSession(nextSession);

        return {
          ok: true,
          studentMessage:
            '교사용 로그인이 완료되었습니다. 교사 권한 확인은 다음 단계에서 연결합니다.',
        };
      },
      signInTeacherWithEmail: async (input) => {
        const authResult = await signInTeacherWithEmailPassword(input);

        if (!authResult.ok) {
          return {
            ok: false,
            studentMessage: authResult.studentMessage,
            developerMessage: authResult.developerMessage,
          };
        }

        const nextSession: TeacherSession = {
          role: 'teacher',
          uid: authResult.uid,
          displayName: authResult.displayName,
          email: authResult.email,
          authProvider: 'firebase-email',
          signedInAt: new Date().toISOString(),
          teacherAuthorizationStatus: 'pending_custom_claim',
        };

        setSession(nextSession);

        return {
          ok: true,
          studentMessage:
            '교사용 로그인이 완료되었습니다. 교사 권한 확인은 다음 단계에서 연결합니다.',
        };
      },
      clearSession: () => {
        setSession(null);
        void signOutFirebaseAuth();
      },
    }),
    [session],
  );

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSession(): UserSessionContextValue {
  const context = useContext(UserSessionContext);

  if (!context) {
    throw new Error('useUserSession must be used within UserSessionProvider.');
  }

  return context;
}
