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
  isEmergencyTeacherLoginConfigured: boolean;
  enterStudentSession: (input: StudentEntryInput) => Promise<SessionActionResult>;
  signInTeacherWithGoogle: () => Promise<SessionActionResult>;
  signInTeacherWithEmail: (input: {
    email: string;
    password: string;
  }) => Promise<SessionActionResult>;
  signInTeacherEmergency: (input: {
    username: string;
    password: string;
  }) => Promise<SessionActionResult>;
  clearSession: () => void;
};

type UserSessionProviderProps = {
  children: ReactNode;
  initialSession?: UserSession | null;
};

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

function getEmergencyTeacherCredentials(): {
  username: string;
  password: string;
  isConfigured: boolean;
} {
  const username =
    import.meta.env.VITE_EMERGENCY_TEACHER_USERNAME?.trim() ?? '';
  const password = import.meta.env.VITE_EMERGENCY_TEACHER_PASSWORD ?? '';

  return {
    username,
    password,
    isConfigured: Boolean(username && password),
  };
}

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
      isEmergencyTeacherLoginConfigured:
        getEmergencyTeacherCredentials().isConfigured,
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
          idToken: authResult.ok ? authResult.idToken : undefined,
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
      signInTeacherEmergency: async (input) => {
        const credentials = getEmergencyTeacherCredentials();
        const username = input.username.trim();

        if (!credentials.isConfigured) {
          return {
            ok: false,
            studentMessage: '긴급 교사용 로그인이 설정되어 있지 않습니다.',
            developerMessage:
              'Emergency teacher login is not configured in Vite environment variables.',
          };
        }

        if (
          username !== credentials.username ||
          input.password !== credentials.password
        ) {
          return {
            ok: false,
            studentMessage: '긴급 교사용 로그인 정보를 다시 확인해 주세요.',
            developerMessage:
              'Emergency teacher login rejected: invalid local credentials.',
          };
        }

        const nextSession: TeacherSession = {
          role: 'teacher',
          uid: 'emergency-teacher-local',
          displayName: '긴급 교사',
          authProvider: 'emergency-local',
          signedInAt: new Date().toISOString(),
          teacherAuthorizationStatus: 'authorized',
          isEmergencyAccess: true,
        };

        setSession(nextSession);

        return {
          ok: true,
          studentMessage:
            '긴급 교사용 보기로 입장했습니다. 서버 제출/Firestore 기능은 Firebase 교사 로그인 때만 사용할 수 있습니다.',
          developerMessage:
            'Emergency local teacher session created without Firebase ID token.',
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
