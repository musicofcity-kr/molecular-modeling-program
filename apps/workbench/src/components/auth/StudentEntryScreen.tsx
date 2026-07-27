import { useState } from 'react';
import { useUserSession } from '../../contexts/UserSessionContext';

type StudentEntryScreenProps = {
  onEntered: () => void;
  onOpenTeacher: () => void;
};

const ENTRY_ERROR_MESSAGE_ID = 'student-entry-error-message';

export function StudentEntryScreen({
  onEntered,
  onOpenTeacher,
}: StudentEntryScreenProps) {
  const { enterStudentSession } = useUserSession();
  const [classCode, setClassCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isEntering, setIsEntering] = useState(false);
  const hasEntryError = Boolean(message);

  const handleSubmit = async () => {
    setIsEntering(true);
    const result = await enterStudentSession({ classCode, joinCode, nickname });

    if (!result.ok) {
      setMessage(result.studentMessage ?? '입장 정보를 확인해 주세요.');
      setIsEntering(false);
      return;
    }

    setMessage(result.studentMessage ?? '');
    setIsEntering(false);
    onEntered();
  };

  return (
    <section className="workspace-panel entry-panel student-entry-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">학생 입장</p>
          <h2>수업코드로 오늘의 탐구 활동에 들어갑니다</h2>
        </div>
        <button className="secondary-action compact-action" type="button" onClick={onOpenTeacher}>
          교사용 로그인으로 이동
        </button>
      </div>
      <p className="entry-help">
        회원가입 없이 교사가 안내한 수업코드, 입장 확인코드, 수업용 이름만
        사용합니다. 실명이나 학번은 입력하지 않아도 됩니다.
      </p>
      <form
        className="entry-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <label>
          <span>수업코드</span>
          <input
            data-testid="student-class-code-input"
            aria-label="수업코드"
            aria-describedby={ENTRY_ERROR_MESSAGE_ID}
            aria-invalid={hasEntryError}
            value={classCode}
            placeholder="예: CHEM-101"
            onChange={(event) => {
              setClassCode(event.currentTarget.value);
            }}
          />
        </label>
        <label>
          <span>입장 확인코드</span>
          <input
            data-testid="student-join-code-input"
            aria-label="입장 확인코드"
            aria-describedby={ENTRY_ERROR_MESSAGE_ID}
            aria-invalid={hasEntryError}
            value={joinCode}
            placeholder="교사가 알려준 코드"
            onChange={(event) => {
              setJoinCode(event.currentTarget.value);
            }}
          />
        </label>
        <label>
          <span>수업용 닉네임 또는 익명 ID</span>
          <input
            data-testid="student-nickname-input"
            aria-label="수업용 닉네임 또는 익명 ID"
            aria-describedby={ENTRY_ERROR_MESSAGE_ID}
            aria-invalid={hasEntryError}
            value={nickname}
            placeholder="예: 3조-학생A"
            onChange={(event) => {
              setNickname(event.currentTarget.value);
            }}
          />
        </label>
        <p
          id={ENTRY_ERROR_MESSAGE_ID}
          className="entry-message warning"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          hidden={!hasEntryError}
        >
          {message}
        </p>
        <button
          className="primary-action"
          data-testid="student-entry-submit-button"
          type="submit"
          disabled={isEntering}
        >
          {isEntering ? '입장 준비 중' : '분자구조 모델링 활동 시작하기'}
        </button>
      </form>
      <ul className="entry-note-list">
        <li>교사가 만든 수업방과 입장 확인코드가 연결된 경우 서버 제출함을 사용할 수 있습니다.</li>
        <li>활동 결과 임시 저장은 현재 브라우저에만 보관됩니다.</li>
        <li>분자식과 평균 분자량은 구조 확인을 통과한 경우에만 표시됩니다.</li>
      </ul>
    </section>
  );
}
