type AppHeaderProps = {
  onExtractStructure: () => void;
};

export function AppHeader({ onExtractStructure }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">수업용 분자 구조 편집기 MVP</p>
        <h1>Molecule Modeling Workbench</h1>
      </div>
      <div className="header-actions">
        <p className="header-status" aria-label="현재 구현 상태">
          Phase 2: Ketcher 구조 입력
        </p>
        <button className="primary-action" type="button" onClick={onExtractStructure}>
          구조 가져오기
        </button>
      </div>
    </header>
  );
}
