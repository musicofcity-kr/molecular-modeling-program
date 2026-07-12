import type { ReactNode } from 'react';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

type ShapeViewerSectionProps = {
  predictionSlot: ReactNode;
  thoughtSubmissionSlot?: ReactNode;
  actual3DSlot: ReactNode;
  comparisonSlot: ReactNode;
  external3DSearchSlot?: ReactNode;
  collapsible?: boolean;
};

export function ShapeViewerSection({
  predictionSlot,
  thoughtSubmissionSlot,
  actual3DSlot,
  comparisonSlot,
  external3DSearchSlot,
  collapsible,
}: ShapeViewerSectionProps) {
  return (
    <>
      <CollapsibleStudentStep
        id="student-step-5"
        className="student-step shape-viewer-section"
        testId="shape-viewer-section"
        sectionLabel="구조 보기"
        title="검증된 3D 구조와 VSEPR 모형을 확인합니다"
        collapsible={collapsible}
      >
        {external3DSearchSlot}

        <div className="shape-viewer-grid">
          <div className="shape-viewer-column">
            {predictionSlot}
            {thoughtSubmissionSlot}
          </div>
          {actual3DSlot}
        </div>
      </CollapsibleStudentStep>
      {comparisonSlot}
    </>
  );
}
