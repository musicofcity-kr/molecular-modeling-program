type RoleSelectionScreenProps = {
  onOpenStudent: () => void;
  onOpenTeacher: () => void;
};

export function RoleSelectionScreen({
  onOpenStudent,
  onOpenTeacher,
}: RoleSelectionScreenProps) {
  return (
    <section className="workspace-panel entry-panel role-selection-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">시작하기</p>
          <h2>수업에서 사용할 화면을 선택합니다</h2>
        </div>
      </div>
      <p className="entry-help">
        학생은 회원가입 없이 수업코드로 입장하고, 교사용 화면은 Firebase Auth
        연결을 준비하는 별도 경로로 분리합니다.
      </p>
      <div className="role-selection-grid">
        <article className="role-selection-card">
          <p className="section-label">학생용</p>
          <h3>오늘의 탐구 활동</h3>
          <p>
            수업코드와 입장 확인코드로 입장해 분자 구조를 그리고 확인합니다.
            서버에는 학생 개인정보를 저장하지 않습니다.
          </p>
          <button
            className="primary-action"
            data-testid="open-student-entry-button"
            type="button"
            onClick={onOpenStudent}
          >
            학생으로 입장하기
          </button>
        </article>
        <article className="role-selection-card">
          <p className="section-label">교사용</p>
          <h3>교사용 안내와 수업 준비</h3>
          <p>
            Google 또는 이메일 로그인을 연결할 수 있는 구조를 준비합니다. 실제
            인증 전에는 비공개 해설과 제출 데이터가 열리지 않습니다.
          </p>
          <button
            className="secondary-action"
            data-testid="open-teacher-entry-button"
            type="button"
            onClick={onOpenTeacher}
          >
            교사용 로그인으로 이동
          </button>
        </article>
      </div>
    </section>
  );
}
