type AppHeaderProps = {
  onExtractAndValidate: () => void;
};

export function AppHeader({ onExtractAndValidate }: AppHeaderProps) {
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
        <button className="primary-action" type="button" onClick={onExtractAndValidate}>
          구조 검증하기
        </button>
      </div>
    </header>
  );
}
