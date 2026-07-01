import type { ExampleMolecule } from '../../data/exampleMolecules';
import type { AppMode, UserMode } from '../../types/activity';

type AppHeaderProps = {
  appMode: AppMode;
  userMode: UserMode;
  onModeChange: (mode: AppMode) => void;
  onUserModeChange: (mode: UserMode) => void;
  onExtractAndValidate: () => void;
  teacherControlsEnabled?: boolean;
  examples: ExampleMolecule[];
  selectedExampleId: string;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void;
};

export function AppHeader({
  appMode,
  userMode,
  onModeChange,
  onUserModeChange,
  onExtractAndValidate,
  teacherControlsEnabled = true,
  examples,
  selectedExampleId,
  onSelectExample,
  onLoadExample,
}: AppHeaderProps) {
  const categories = Array.from(new Set(examples.map((example) => example.category)));
  const showTeacherControls = userMode === 'teacher' && teacherControlsEnabled;
  const showHeaderExampleControls = showTeacherControls;

  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">고1 화학 · 결합의 세계</p>
        <h1>다양한 분자의 분자구조 모델링</h1>
      </div>
      <div className="header-actions">
        <p className="header-status" aria-label="현재 구현 상태">
          검증된 값만 표시
        </p>
        {showTeacherControls ? (
          <>
            <div className="mode-group" aria-label="사용자 모드 전환">
              <span>사용자</span>
              <div className="mode-switch">
                <button
                  className="mode-action"
                  data-testid="user-mode-student"
                  type="button"
                  onClick={() => {
                    onUserModeChange('student');
                  }}
                >
                  학생 활동
                </button>
                <button
                  className={userMode === 'teacher' ? 'mode-action active' : 'mode-action'}
                  data-testid="user-mode-teacher"
                  type="button"
                  onClick={() => {
                    onUserModeChange('teacher');
                  }}
                >
                  교사용 안내
                </button>
              </div>
            </div>
            <div className="mode-group" aria-label="앱 모드 전환">
              <span>작업</span>
              <div className="mode-switch">
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
                  직접 그리기
                </button>
                <button
                  className={appMode === 'activity' ? 'mode-action active' : 'mode-action'}
                  data-testid="mode-activity"
                  type="button"
                  onClick={() => {
                    onModeChange('activity');
                  }}
                >
                  오늘의 탐구 활동
                </button>
              </div>
            </div>
          </>
        ) : (
          <button
            className="secondary-action compact-action"
            data-testid="user-mode-teacher"
            type="button"
            onClick={() => {
              onUserModeChange('teacher');
            }}
          >
            교사용 안내
          </button>
        )}
        {showHeaderExampleControls ? (
          <>
            <label className="example-picker">
              <span>분자 예시 선택</span>
              <select
                data-testid="example-select"
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
              data-testid="load-example-button"
              type="button"
              onClick={onLoadExample}
            >
              분자 예시 불러오기
            </button>
            <button
              className="primary-action"
              data-testid="validate-button"
              type="button"
              onClick={onExtractAndValidate}
            >
              내 구조 확인하기
            </button>
          </>
        ) : null}
      </div>
    </header>
  );
}
