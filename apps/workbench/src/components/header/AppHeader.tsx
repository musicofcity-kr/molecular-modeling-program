import type { ExampleMolecule } from '../../data/exampleMolecules';

type AppHeaderProps = {
  onExtractAndValidate: () => void;
  examples: ExampleMolecule[];
  selectedExampleId: string;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void;
};

export function AppHeader({
  onExtractAndValidate,
  examples,
  selectedExampleId,
  onSelectExample,
  onLoadExample,
}: AppHeaderProps) {
  const categories = Array.from(new Set(examples.map((example) => example.category)));

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">수업용 분자 구조 편집기 MVP</p>
        <h1>Molecule Modeling Workbench</h1>
      </div>
      <div className="header-actions">
        <p className="header-status" aria-label="현재 구현 상태">
          Phase 6: 정적 3D 예제 좌표
        </p>
        <label className="example-picker">
          <span>예제</span>
          <select
            data-testid="example-select"
            aria-label="예제 분자 선택"
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
          data-testid="load-example-button"
          type="button"
          onClick={onLoadExample}
        >
          예제 불러오기
        </button>
        <button
          className="primary-action"
          data-testid="validate-button"
          type="button"
          onClick={onExtractAndValidate}
        >
          구조 검증하기
        </button>
      </div>
    </header>
  );
}
