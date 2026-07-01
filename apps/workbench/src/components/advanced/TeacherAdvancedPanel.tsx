import type { ReactNode } from 'react';

type TeacherAdvancedPanelProps = {
  children: ReactNode;
  visible: boolean;
};

export function TeacherAdvancedPanel({
  children,
  visible,
}: TeacherAdvancedPanelProps) {
  if (!visible) {
    return null;
  }

  return (
    <section className="teacher-advanced-panel" data-testid="teacher-advanced-panel">
      <div className="panel-heading">
        <p className="section-label">교사용 / 고급 보기</p>
        <h2>구조 데이터와 외부 자료 확인</h2>
      </div>
      <div className="teacher-advanced-grid">{children}</div>
    </section>
  );
}
