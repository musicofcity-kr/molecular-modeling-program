import type { ReactNode } from 'react';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

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
    <>
      <CollapsibleStudentStep
        id="student-step-5"
        className="student-step shape-viewer-section phase-verify"
        testId="shape-viewer-section"
        stepNumber={5}
        sectionLabel="입체 구조 보기"
        title="예측 모형과 3D 구조를 구분해서 관찰합니다"
      >
        {external3DSearchSlot}

        <div className="shape-viewer-grid">
          {predictionSlot}
          {actual3DSlot}
        </div>
      </CollapsibleStudentStep>
      {comparisonSlot}
    </>
  );
}
