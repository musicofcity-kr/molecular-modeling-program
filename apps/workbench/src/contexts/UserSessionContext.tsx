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
import { joinClassroomWithTrustedEndpoint } from '../services/firebase/classroomJoinService';
import type { TeacherAuthorizationStatus } from '../types/session';

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

function getTeacherAuthorizationMessage(status: TeacherAuthorizationStatus): string {
  if (status === 'authorized') {
    return '교사 권한 확인이 완료되었습니다.';
  }

  if (status === 'not_checked') {
    return '교사용 로그인은 완료되었지만 교사 권한 상태를 확인하지 못했습니다.';
  }

  return '교사용 로그인은 완료되었지만 교사 권한 승인이 아직 필요합니다.';
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

        const anonymousStudentId = createAnonymousId();
        const joinResult = await joinClassroomWithTrustedEndpoint({
          classCode: validation.classCode,
          joinCode: validation.joinCode,
          displayName: validation.displayName,
          anonymousStudentId,
          firebaseUid: authResult.ok ? authResult.uid : undefined,
          idToken: authResult.ok ? authResult.idToken : undefined,
        });

        const nextSession: StudentSession = {
          role: 'student',
          classCode: validation.classCode,
          displayName: validation.displayName,
          anonymousStudentId,
          startedAt: new Date().toISOString(),
          firebaseUid: authResult.ok ? authResult.uid : undefined,
          authProvider: authResult.ok ? 'firebase-anonymous' : 'local-only',
          authStatus: authResult.ok ? 'authenticated' : 'local_only',
          classroomJoinStatus: joinResult.status,
          classroomJoinMessage: joinResult.studentMessage,
          activityTemplateIds:
            joinResult.activityTemplateIds.length > 0
              ? joinResult.activityTemplateIds
              : undefined,
        };

        setSession(nextSession);

        return {
          ok: true,
          studentMessage: authResult.ok
            ? joinResult.studentMessage
            : authResult.studentMessage,
          developerMessage: [
            authResult.ok ? undefined : authResult.developerMessage,
            joinResult.developerMessage,
          ]
            .filter(Boolean)
            .join(' | '),
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

        const teacherAuthorizationStatus =
          authResult.teacherAuthorizationStatus ?? 'pending_custom_claim';
        const nextSession: TeacherSession = {
          role: 'teacher',
          uid: authResult.uid,
          idToken: authResult.idToken,
          displayName: authResult.displayName,
          email: authResult.email,
          authProvider: 'firebase-google',
          signedInAt: new Date().toISOString(),
          teacherAuthorizationStatus,
        };

        setSession(nextSession);

        return {
          ok: true,
          studentMessage: getTeacherAuthorizationMessage(
            teacherAuthorizationStatus,
          ),
          developerMessage: authResult.developerMessage,
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

        const teacherAuthorizationStatus =
          authResult.teacherAuthorizationStatus ?? 'pending_custom_claim';
        const nextSession: TeacherSession = {
          role: 'teacher',
          uid: authResult.uid,
          idToken: authResult.idToken,
          displayName: authResult.displayName,
          email: authResult.email,
          authProvider: 'firebase-email',
          signedInAt: new Date().toISOString(),
          teacherAuthorizationStatus,
        };

        setSession(nextSession);

        return {
          ok: true,
          studentMessage: getTeacherAuthorizationMessage(
            teacherAuthorizationStatus,
          ),
          developerMessage: authResult.developerMessage,
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
