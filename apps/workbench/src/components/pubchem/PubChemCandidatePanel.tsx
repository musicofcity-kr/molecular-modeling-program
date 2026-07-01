import type { PubChemCandidate, PubChemMatchStatus } from '../../types/molecule';

type PubChemCandidatePanelDisplayMode = 'teacher' | 'student';

type PubChemCandidatePanelProps = {
  canSearch: boolean;
  status: PubChemMatchStatus;
  candidates: PubChemCandidate[];
  displayMode?: PubChemCandidatePanelDisplayMode;
  studentMessage?: string;
  warnings: string[];
  selectedCandidateCid?: number;
  isLoading3D: boolean;
  onSearch: () => void;
  onSelectCandidate: (candidate: PubChemCandidate) => void;
};

function formatStatus(status: PubChemMatchStatus): string {
  switch (status) {
    case 'not_requested':
      return '검색 전';
    case 'searching':
      return '검색 중';
    case 'no_match':
      return '후보 없음';
    case 'single_candidate':
      return '후보 1개';
    case 'multiple_candidates':
      return '후보 여러 개';
    case 'error':
      return '검색 오류';
  }
}

function formatStudentText(value: string): string {
  return value
    .replace(/PubChem SMILES 표기/g, '외부 자료의 구조 표기')
    .replace(/RDKit\.js canonical SMILES/g, '구조 확인 결과')
    .replace(/RDKit\.js 검증/g, '구조 확인')
    .replace(/canonical SMILES/g, '구조 문자열')
    .replace(/SMILES/g, '구조 문자열')
    .replace(/PubChem 후보/g, '외부 자료 후보')
    .replace(/PubChem/g, '외부 자료')
    .replace(/RDKit\.js/g, '구조 확인')
    .replace(/\bCID\b/g, '후보 번호');
}

function formatCandidateTitle(
  candidate: PubChemCandidate,
  index: number,
  displayMode: PubChemCandidatePanelDisplayMode,
): string {
  if (candidate.title) {
    return displayMode === 'student' ? formatStudentText(candidate.title) : candidate.title;
  }

  if (displayMode === 'student') {
    return `3D 자료 후보 ${index + 1}`;
  }

  return `3D 자료 후보 ${candidate.cid}`;
}

export function PubChemCandidatePanel({
  canSearch,
  status,
  candidates,
  displayMode = 'teacher',
  studentMessage,
  warnings,
  selectedCandidateCid,
  isLoading3D,
  onSearch,
  onSelectCandidate,
}: PubChemCandidatePanelProps) {
  const isStudentMode = displayMode === 'student';
  const fallbackMessage =
    '구조 확인을 통과한 구조에서만 외부 3D 자료 후보 검색을 요청할 수 있습니다.';
  const panelMessage = studentMessage ?? fallbackMessage;
  const visibleMessage = isStudentMode ? formatStudentText(panelMessage) : panelMessage;
  const visibleWarnings = isStudentMode ? warnings.map(formatStudentText) : warnings;

  return (
    <section
      className={`workspace-panel pubchem-candidate-panel ${status} ${displayMode}-mode`}
      data-testid="pubchem-candidate-panel"
    >
      <div className="panel-heading pubchem-candidate-heading">
        <div>
          <p className="section-label">외부 3D 자료 후보</p>
          <h2>외부 3D 자료 찾기</h2>
        </div>
        <span className="status-pill">{formatStatus(status)}</span>
      </div>

      <div className="pubchem-candidate-actions">
        <p>
          외부 데이터베이스에서 3D 구조 후보를 찾아봅니다. 후보 정보는 확인용
          보조 정보이며, 분자식과 분자량의 기준은 구조 확인 결과입니다.
        </p>
        <button
          className="secondary-action"
          data-testid="search-pubchem-candidates-button"
          type="button"
          disabled={!canSearch || status === 'searching'}
          onClick={onSearch}
        >
          {status === 'searching' ? '외부 3D 자료 찾는 중' : '외부 3D 자료 찾기'}
        </button>
      </div>

      <p className="pubchem-candidate-message">
        {visibleMessage}
      </p>

      {visibleWarnings.length > 0 ? (
        <ul className="pubchem-candidate-warnings">
          {visibleWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {candidates.length > 0 ? (
        <ol className="pubchem-candidate-list">
          {candidates.map((candidate, index) => (
            <li
              className={
                selectedCandidateCid === candidate.cid
                  ? 'pubchem-candidate selected'
                  : 'pubchem-candidate'
              }
              data-testid="pubchem-candidate"
              key={candidate.cid}
            >
              <div>
                <p className="pubchem-candidate-title">
                  외부 데이터 후보: {formatCandidateTitle(candidate, index, displayMode)}
                </p>
                <dl>
                  {isStudentMode ? null : (
                    <div>
                      <dt>3D 자료 후보 번호</dt>
                      <dd>{candidate.cid}</dd>
                    </div>
                  )}
                  <div>
                    <dt>분자식</dt>
                    <dd>{candidate.molecularFormula ?? '제공되지 않음'}</dd>
                  </div>
                  <div>
                    <dt>분자량</dt>
                    <dd>{candidate.molecularWeight ?? '제공되지 않음'}</dd>
                  </div>
                  {isStudentMode ? null : (
                    <div>
                      <dt>외부 자료 구조 문자열</dt>
                      <dd className="code-output">
                        {candidate.isomericSmiles ??
                          candidate.canonicalSmiles ??
                          '제공되지 않음'}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
              <button
                className="secondary-action"
                data-testid={`select-pubchem-candidate-${candidate.cid}`}
                type="button"
                disabled={isLoading3D}
                onClick={() => {
                  onSelectCandidate(candidate);
                }}
              >
                {isStudentMode ? '이 자료 선택' : '이 3D 자료 불러오기'}
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
