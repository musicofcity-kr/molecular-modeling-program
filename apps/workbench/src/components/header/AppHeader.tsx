import type { ExampleMolecule } from '../../data/exampleMolecules';
import type { AppMode } from '../../types/activity';

type AppHeaderProps = {
  appMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  onExtractAndValidate: () => void;
  examples: ExampleMolecule[];
  selectedExampleId: string;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void;
};

export function AppHeader({
  appMode,
  onModeChange,
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
          Phase 10: VSEPR 예측 엔진 MVP
        </p>
        <div className="mode-switch" aria-label="앱 모드 전환">
          <button
            className={
              appMode === 'free_draw' ? 'mode-action active' : 'mode-action'
            }
            data-testid="mode-free-draw"
            type="button"
            onClick={() => {
              onModeChange('free_draw');
            }}
          >
            자유 그리기
          </button>
          <button
            className={appMode === 'activity' ? 'mode-action active' : 'mode-action'}
            data-testid="mode-activity"
            type="button"
            onClick={() => {
              onModeChange('activity');
            }}
          >
            수업 활동
          </button>
        </div>
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
