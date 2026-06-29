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
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">수업용 분자 구조 편집기 MVP</p>
        <h1>Molecule Modeling Workbench</h1>
      </div>
      <div className="header-actions">
        <p className="header-status" aria-label="현재 구현 상태">
          Phase 3: RDKit.js 구조 검증
        </p>
        <label className="example-picker">
          <span>예제</span>
          <select
            aria-label="예제 분자 선택"
            value={selectedExampleId}
            onChange={(event) => {
              onSelectExample(event.currentTarget.value);
            }}
          >
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.nameKo} ({example.nameEn})
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-action" type="button" onClick={onLoadExample}>
          예제 불러오기
        </button>
        <button className="primary-action" type="button" onClick={onExtractAndValidate}>
          구조 검증하기
        </button>
      </div>
    </header>
  );
}
