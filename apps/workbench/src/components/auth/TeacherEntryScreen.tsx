import { useState } from 'react';
import { getFirebaseConfigStatus } from '../../config/firebaseConfig';
import { useUserSession } from '../../contexts/UserSessionContext';

type TeacherEntryScreenProps = {
  onOpenStudent: () => void;
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

export function TeacherEntryScreen({ onOpenStudent }: TeacherEntryScreenProps) {
  const { prepareTeacherAuth } = useUserSession();
  const [message, setMessage] = useState('');
  const firebaseStatus = getFirebaseConfigStatus();

  const handlePreparedAuth = () => {
    const result = prepareTeacherAuth('firebase-google');
    setMessage(result.studentMessage);
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
        현재 단계에서는 실제 교사용 인증을 실행하지 않습니다. Google 로그인과
        이메일 로그인은 Firebase Auth 연결 단계에서 활성화합니다.
      </p>

      <div className="teacher-login-grid">
        <button className="secondary-action" type="button" onClick={handlePreparedAuth}>
          Google 로그인 연결 준비
        </button>
        <form
          className="teacher-email-form"
          onSubmit={(event) => {
            event.preventDefault();
            const result = prepareTeacherAuth('firebase-email');
            setMessage(result.studentMessage);
          }}
        >
          <label>
            <span>교사용 이메일</span>
            <input aria-label="교사용 이메일" placeholder="teacher@example.com" />
          </label>
          <button className="secondary-action" type="submit">
            이메일 로그인 연결 준비
          </button>
        </form>
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
