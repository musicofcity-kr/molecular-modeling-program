import type { ReactNode } from 'react';
import type { ExampleMolecule } from '../../data/exampleMolecules';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

type MoleculeDrawingStepProps = {
  drawingSlot: ReactNode;
  examples: ExampleMolecule[];
  selectedExampleId: string;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void | Promise<void>;
  onClearStructure?: () => void | Promise<void>;
  onConfirmStructure: () => void;
  isAnalyzing?: boolean;
  analysisErrorMessage?: string;
  collapsible?: boolean;
};

export function MoleculeDrawingStep({
  drawingSlot,
  examples,
  selectedExampleId,
  onSelectExample,
  onLoadExample,
  onClearStructure,
  onConfirmStructure,
  isAnalyzing = false,
  analysisErrorMessage,
  collapsible,
}: MoleculeDrawingStepProps) {
  const categories = Array.from(new Set(examples.map((example) => example.category)));

  return (
    <CollapsibleStudentStep
      id="student-step-2"
      className="student-step drawing-step"
      testId="drawing-step"
      sectionLabel="구조 만들기"
      title="분자 구조를 그리거나 예제를 불러옵니다"
      collapsible={collapsible}
    >
      <div className="student-drawing-actions">
        <label className="example-picker">
          <span>분자 예시 선택</span>
          <select
            data-testid="student-example-select"
            aria-label="분자 예시 선택"
            value={selectedExampleId}
            onChange={(event) => {
              onSelectExample(event.currentTarget.value);
            }}
          >
            {categories.map((category) => (
              <optgroup key={category} label={category}>
                {examples
                  .filter((example) => example.category === category)
                  .map((example) => (
                    <option key={example.id} value={example.id}>
                      {example.nameKo} ({example.nameEn})
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <button
          className="secondary-action"
          data-testid="student-load-example-button"
          type="button"
          disabled={isAnalyzing}
          onClick={onLoadExample}
        >
          예시 구조 불러오기
        </button>
        {onClearStructure ? (
          <button
            className="secondary-action destructive-action"
            data-testid="student-clear-structure-button"
            type="button"
            disabled={isAnalyzing}
            onClick={() => {
              void onClearStructure();
            }}
          >
            구조 초기화
          </button>
        ) : null}
        <button
          className="primary-action"
          data-testid="student-confirm-structure-button"
          type="button"
          disabled={isAnalyzing}
          onClick={onConfirmStructure}
        >
          {isAnalyzing ? '2D 구조 분석 중' : '2D 구조 분석하기'}
        </button>
      </div>

      <p className="student-editor-guidance" aria-live="polite">
        간편 모드에서는 원자·단일/이중/삼중 결합·선택·이동·삭제·실행 취소를
        중심으로 사용합니다. 더 많은 도구가 필요할 때만 고급 편집 모드로
        전환하세요. {isAnalyzing ? '현재 구조를 분석하고 있습니다.' : ''}
      </p>
      <details
        className="direct-chain-drawing-guide"
        data-testid="direct-chain-drawing-guide"
      >
        <summary>탄소 사슬을 한 번에 연결해서 그리는 법</summary>
        <ol>
          <li>편집기 왼쪽의 지그재그 선 모양 사슬(Chain) 도구를 선택합니다.</li>
          <li>빈 캔버스에서 시작점을 누른 채 드래그합니다.</li>
          <li>끝점에서 놓은 뒤 결합선으로 이어졌는지 확인합니다.</li>
        </ol>
        <p>
          원자를 따로 여러 번 놓으면 서로 연결되지 않은 조각이 됩니다. 그
          상태에서는 분자식과 분자량을 계산하지 않습니다.
        </p>
        <p>
          사슬 도구를 찾기 어렵다면 단일 결합 도구를 고르고, 기존 원자에서
          다음 원자 위치까지 끌어 연결할 수도 있습니다.
        </p>
      </details>
      {analysisErrorMessage ? (
        <div
          className="structure-analysis-alert"
          data-testid="structure-analysis-alert"
          role="alert"
          aria-live="assertive"
        >
          <strong>구조를 분석하지 못했습니다.</strong>
          <p>{analysisErrorMessage}</p>
        </div>
      ) : null}
      {drawingSlot}
    </CollapsibleStudentStep>
  );
}
