import { useState, type ReactNode } from 'react';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

type ShapeViewerSectionProps = {
  predictionSlot: ReactNode;
  actual3DSlot: ReactNode;
  comparisonSlot: ReactNode;
  external3DSearchSlot?: ReactNode;
  collapsible?: boolean;
};

export function ShapeViewerSection({
  predictionSlot,
  actual3DSlot,
  comparisonSlot,
  external3DSearchSlot,
  collapsible,
}: ShapeViewerSectionProps) {
  const [mobileViewer, setMobileViewer] = useState<'vsepr' | 'reference'>('vsepr');

  return (
    <>
      <CollapsibleStudentStep
        id="student-step-4"
        className="student-step shape-viewer-section"
        testId="shape-viewer-section"
        sectionLabel="3D 비교"
        title="참고 3D 구조와 VSEPR 예상 모형을 구분해 비교합니다"
        collapsible={collapsible}
      >
        {external3DSearchSlot}

        <div
          className="mobile-viewer-switch"
          role="tablist"
          aria-label="모바일 3D 비교 화면 선택"
        >
          <button
            className={mobileViewer === 'vsepr' ? 'active' : ''}
            data-testid="mobile-vsepr-view-button"
            type="button"
            role="tab"
            aria-selected={mobileViewer === 'vsepr'}
            onClick={() => {
              setMobileViewer('vsepr');
            }}
          >
            VSEPR 예상 모형
          </button>
          <button
            className={mobileViewer === 'reference' ? 'active' : ''}
            data-testid="mobile-reference-3d-view-button"
            type="button"
            role="tab"
            aria-selected={mobileViewer === 'reference'}
            onClick={() => {
              setMobileViewer('reference');
            }}
          >
            참고 3D 구조
          </button>
        </div>

        <div className="shape-viewer-grid" data-mobile-viewer={mobileViewer}>
          <div className="shape-viewer-column vsepr-viewer-column">
            {predictionSlot}
          </div>
          <div className="shape-viewer-column reference-viewer-column">
            {actual3DSlot}
          </div>
        </div>

        <aside className="structure-comparison-prompts" aria-labelledby="comparison-prompt-title">
          <div>
            <p className="section-label">비교 질문</p>
            <h3 id="comparison-prompt-title">두 모형의 공통점과 차이점은 무엇인가요?</h3>
          </div>
          <ul>
            <li>원자의 배열과 전체 모양에서 같은 점을 찾아보세요.</li>
            <li>비공유 전자쌍이 어느 모형에 어떻게 표현되는지 비교해 보세요.</li>
            <li>참고 3D 자료와 이론 모형이 다른 이유를 다음 단계에 적어보세요.</li>
          </ul>
        </aside>
      </CollapsibleStudentStep>
      {comparisonSlot}
    </>
  );
}
