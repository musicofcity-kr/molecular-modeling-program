const TEACHER_DASHBOARD_ITEMS = [
  {
    title: '수업방 생성',
    body: '수업명, 수업코드, 사용할 활동 템플릿을 고르는 화면을 이후 Firestore 연결 단계에서 활성화합니다.',
  },
  {
    title: '활동 관리',
    body: '분자 예시와 탐구 활동 템플릿을 수업방에 배정하는 교사용 작업 흐름을 준비합니다.',
  },
  {
    title: '제출 목록',
    body: '학생 익명 ID 기준 제출 현황을 표시할 자리입니다. 현재 단계에서는 서버 저장과 목록 조회를 하지 않습니다.',
  },
];

export function TeacherDashboardPlaceholder() {
  return (
    <section
      className="workspace-panel entry-panel teacher-dashboard-placeholder"
      data-testid="teacher-dashboard-placeholder"
    >
      <div className="panel-heading teacher-entry-heading">
        <div>
          <p className="section-label">교사용 대시보드 준비</p>
          <h2>인증 기반 수업 운영 화면의 뼈대입니다</h2>
        </div>
        <span className="status-pill">Firestore 저장 비활성</span>
      </div>
      <p className="entry-help">
        이 영역은 Firebase Auth와 Firestore Security Rules가 준비된 뒤 실제
        교사용 대시보드로 연결합니다. 지금은 기존 분자구조 모델링 기능과
        교사용 안내를 검토하는 placeholder입니다.
      </p>
      <div className="teacher-placeholder-grid">
        {TEACHER_DASHBOARD_ITEMS.map((item) => (
          <article className="teacher-placeholder-card" key={item.title}>
            <p className="section-label">{item.title}</p>
            <p>{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
