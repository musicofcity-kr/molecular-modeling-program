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
  TeacherAuthProvider,
  UserSession,
} from '../types/session';
import { validateStudentEntryInput } from '../types/session';

type UserSessionContextValue = {
  session: UserSession | null;
  enterStudentSession: (input: StudentEntryInput) => {
    ok: boolean;
    studentMessage?: string;
  };
  prepareTeacherAuth: (provider: TeacherAuthProvider) => {
    ok: false;
    studentMessage: string;
  };
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
      enterStudentSession: (input) => {
        const validation = validateStudentEntryInput(input);

        if (!validation.ok) {
          return {
            ok: false,
            studentMessage: validation.studentMessage,
          };
        }

        const nextSession: StudentSession = {
          role: 'student',
          classCode: validation.classCode,
          displayName: validation.displayName,
          anonymousStudentId: createAnonymousId(),
          startedAt: new Date().toISOString(),
        };

        setSession(nextSession);

        return { ok: true };
      },
      prepareTeacherAuth: () => ({
        ok: false,
        studentMessage:
          'Firebase Auth 연결 전입니다. 실제 교사용 로그인은 다음 단계에서 활성화합니다.',
      }),
      clearSession: () => {
        setSession(null);
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
