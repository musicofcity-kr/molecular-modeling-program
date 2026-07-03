import { useState } from 'react';
import { getFirebaseConfigStatus } from '../../config/firebaseConfig';
import { useUserSession } from '../../contexts/UserSessionContext';

type TeacherEntryScreenProps = {
  onOpenStudent: () => void;
  onAuthenticated?: () => void;
};

const TEACHER_PLACEHOLDERS = [
  {
    title: '수업방 생성',
    body: '수업명, 수업코드, 사용할 활동 템플릿을 선택하는 화면을 준비합니다.',
  },
  {
    title: '활동 관리',
    body: '물, 메테인, 에탄올 등 활동 템플릿을 수업방에 배정하는 구조를 준비합니다.',
  },
  {
    title: '제출 목록',
    body: '학생 익명 ID 기준 제출 현황을 보여줄 예정이며, 아직 서버 저장은 하지 않습니다.',
  },
];

export function TeacherEntryScreen({
  onOpenStudent,
  onAuthenticated,
}: TeacherEntryScreenProps) {
  const {
    isEmergencyTeacherLoginConfigured,
    signInTeacherEmergency,
    signInTeacherWithEmail,
    signInTeacherWithGoogle,
  } = useUserSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emergencyUsername, setEmergencyUsername] = useState('');
  const [emergencyPassword, setEmergencyPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const firebaseStatus = getFirebaseConfigStatus();

  const handleAuthResult = (result: {
    ok: boolean;
    studentMessage?: string;
    developerMessage?: string;
  }) => {
    setMessage(result.studentMessage ?? '');

    if (result.developerMessage) {
      console.info('[Firebase Auth]', result.developerMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsAuthenticating(true);
    const result = await signInTeacherWithGoogle();

    handleAuthResult(result);
    setIsAuthenticating(false);

    if (result.ok) {
      onAuthenticated?.();
    }
  };

  const handleEmailSignIn = async () => {
    setIsAuthenticating(true);
    const result = await signInTeacherWithEmail({ email, password });

    handleAuthResult(result);
    setIsAuthenticating(false);

    if (result.ok) {
      onAuthenticated?.();
    }
  };

  const handleEmergencySignIn = async () => {
    setIsAuthenticating(true);
    const result = await signInTeacherEmergency({
      username: emergencyUsername,
      password: emergencyPassword,
    });

    handleAuthResult(result);
    setIsAuthenticating(false);

    if (result.ok) {
      onAuthenticated?.();
    }
  };

  return (
    <section className="workspace-panel entry-panel teacher-entry-panel">
      <div className="panel-heading teacher-entry-heading">
        <div>
          <p className="section-label">교사용 로그인</p>
          <h2>Firebase Auth 기반 교사용 접근을 준비합니다</h2>
        </div>
        <span className="status-pill">
          {firebaseStatus === 'configured' ? 'Firebase 설정 감지' : 'Firebase 미설정'}
        </span>
        <button className="secondary-action compact-action" type="button" onClick={onOpenStudent}>
          학생 입장으로 이동
        </button>
      </div>
      <p className="entry-help">
        Google 로그인 또는 이메일 로그인을 사용합니다. 이번 단계에서는 로그인
        후 teacher custom claim을 확인합니다. 교사 권한이 승인되지 않은 계정은
        교사용 비공개 패널과 서버 저장 기능을 사용할 수 없습니다.
      </p>

      <div className="teacher-login-grid">
        <button
          className="secondary-action"
          type="button"
          disabled={isAuthenticating}
          onClick={() => {
            void handleGoogleSignIn();
          }}
        >
          {isAuthenticating ? 'Google 로그인 중' : 'Google로 교사용 로그인'}
        </button>
        <form
          className="teacher-email-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleEmailSignIn();
          }}
        >
          <label>
            <span>교사용 이메일</span>
            <input
              aria-label="교사용 이메일"
              placeholder="teacher@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.currentTarget.value);
              }}
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              aria-label="교사용 비밀번호"
              placeholder="Firebase Auth 비밀번호"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value);
              }}
            />
          </label>
          <button
            className="secondary-action"
            type="submit"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? '이메일 로그인 중' : '이메일로 교사용 로그인'}
          </button>
        </form>
        {isEmergencyTeacherLoginConfigured ? (
          <form
            className="teacher-email-form teacher-emergency-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleEmergencySignIn();
            }}
          >
            <div>
              <p className="section-label">긴급 교사용 로그인</p>
              <p className="entry-help">
                Firebase 로그인이 어려울 때 교사용 안내 화면만 여는 임시
                방법입니다. 서버 제출/Firestore 기능은 열리지 않습니다.
              </p>
            </div>
            <label>
              <span>긴급 로그인 아이디</span>
              <input
                aria-label="긴급 교사용 아이디"
                placeholder="환경변수에 설정한 아이디"
                value={emergencyUsername}
                onChange={(event) => {
                  setEmergencyUsername(event.currentTarget.value);
                }}
              />
            </label>
            <label>
              <span>긴급 비밀번호</span>
              <input
                aria-label="긴급 교사용 비밀번호"
                placeholder="긴급 비밀번호"
                type="password"
                value={emergencyPassword}
                onChange={(event) => {
                  setEmergencyPassword(event.currentTarget.value);
                }}
              />
            </label>
            <button
              className="secondary-action"
              type="submit"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? '긴급 로그인 확인 중' : '긴급 로그인'}
            </button>
          </form>
        ) : null}
      </div>

      {message ? <p className="entry-message">{message}</p> : null}

      <div className="teacher-placeholder-grid">
        {TEACHER_PLACEHOLDERS.map((item) => (
          <article className="teacher-placeholder-card" key={item.title}>
            <p className="section-label">{item.title}</p>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <p className="entry-security-note">
        실제 인증 전에는 교사용 비공개 해설, 학생 제출 데이터, 개발자 로그를
        공개하지 않습니다.
      </p>
    </section>
  );
}
