import type { ReactNode } from 'react';

type ShapeViewerSectionProps = {
  predictionSlot: ReactNode;
  actual3DSlot: ReactNode;
  comparisonSlot: ReactNode;
  external3DSearchSlot?: ReactNode;
};

export function ShapeViewerSection({
  predictionSlot,
  actual3DSlot,
  comparisonSlot,
  external3DSearchSlot,
}: ShapeViewerSectionProps) {
  return (
    <section className="student-step shape-viewer-section" data-testid="shape-viewer-section">
      <div className="student-step-heading">
        <span className="student-step-number">5</span>
        <div>
          <p className="section-label">입체 구조 보기</p>
          <h2>예측 모형과 3D 구조를 구분해서 관찰합니다</h2>
        </div>
      </div>

      {external3DSearchSlot}

      <div className="shape-viewer-grid">
        {predictionSlot}
        {actual3DSlot}
      </div>
      {comparisonSlot}
    </section>
  );
}
