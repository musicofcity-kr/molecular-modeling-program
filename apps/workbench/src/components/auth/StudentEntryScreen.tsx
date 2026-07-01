import { useState } from 'react';
import { useUserSession } from '../../contexts/UserSessionContext';

type StudentEntryScreenProps = {
  onEntered: () => void;
  onOpenTeacher: () => void;
};

export function StudentEntryScreen({
  onEntered,
  onOpenTeacher,
}: StudentEntryScreenProps) {
  const { enterStudentSession } = useUserSession();
  const [classCode, setClassCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isEntering, setIsEntering] = useState(false);

  const handleSubmit = async () => {
    setIsEntering(true);
    const result = await enterStudentSession({ classCode, nickname });

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
        회원가입 없이 수업코드와 수업용 이름만 사용합니다. 실명이나 학번은
        입력하지 않아도 됩니다.
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
            aria-label="수업코드"
            value={classCode}
            placeholder="예: CHEM-101"
            onChange={(event) => {
              setClassCode(event.currentTarget.value);
            }}
          />
        </label>
        <label>
          <span>수업용 닉네임 또는 익명 ID</span>
          <input
            aria-label="수업용 닉네임 또는 익명 ID"
            value={nickname}
            placeholder="예: 3조-학생A"
            onChange={(event) => {
              setNickname(event.currentTarget.value);
            }}
          />
        </label>
        {message ? <p className="entry-message warning">{message}</p> : null}
        <button className="primary-action" type="submit" disabled={isEntering}>
          {isEntering ? '입장 준비 중' : '분자구조 모델링 활동 시작하기'}
        </button>
      </form>
      <ul className="entry-note-list">
        <li>현재 단계에서는 서버에 학생 제출물을 저장하지 않습니다.</li>
        <li>활동 결과 임시 저장은 현재 브라우저에만 보관됩니다.</li>
        <li>분자식과 평균 분자량은 구조 확인을 통과한 경우에만 표시됩니다.</li>
      </ul>
    </section>
  );
}
