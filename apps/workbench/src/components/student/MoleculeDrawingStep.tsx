import type { ReactNode } from 'react';
import type { ExampleMolecule } from '../../data/exampleMolecules';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

type MoleculeDrawingStepProps = {
  drawingSlot: ReactNode;
  examples: ExampleMolecule[];
  selectedExampleId: string;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void;
  onConfirmStructure: () => void;
  collapsible?: boolean;
};

export function MoleculeDrawingStep({
  drawingSlot,
  examples,
  selectedExampleId,
  onSelectExample,
  onLoadExample,
  onConfirmStructure,
  collapsible,
}: MoleculeDrawingStepProps) {
  const categories = Array.from(new Set(examples.map((example) => example.category)));

  return (
    <CollapsibleStudentStep
      id="student-step-3"
      className="student-step drawing-step phase-build"
      testId="drawing-step"
      stepNumber={3}
      sectionLabel="분자 그리기"
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
          onClick={onLoadExample}
        >
          분자 예시 불러오기
        </button>
        <button
          className="primary-action"
          data-testid="student-confirm-structure-button"
          type="button"
          onClick={onConfirmStructure}
        >
          내 구조 확인하기
        </button>
      </div>

      {drawingSlot}
    </CollapsibleStudentStep>
  );
}
