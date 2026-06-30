import type { PubChemCandidate, PubChemMatchStatus } from '../../types/molecule';

type PubChemCandidatePanelProps = {
  canSearch: boolean;
  status: PubChemMatchStatus;
  candidates: PubChemCandidate[];
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

export function PubChemCandidatePanel({
  canSearch,
  status,
  candidates,
  studentMessage,
  warnings,
  selectedCandidateCid,
  isLoading3D,
  onSearch,
  onSelectCandidate,
}: PubChemCandidatePanelProps) {
  return (
    <section
      className={`workspace-panel pubchem-candidate-panel ${status}`}
      data-testid="pubchem-candidate-panel"
    >
      <div className="panel-heading pubchem-candidate-heading">
        <div>
          <p className="section-label">외부 데이터 후보</p>
          <h2>PubChem 후보 검색</h2>
        </div>
        <span className="status-pill">{formatStatus(status)}</span>
      </div>

      <div className="pubchem-candidate-actions">
        <p>
          외부 데이터베이스에서 3D 구조 후보를 찾아봅니다. 후보 정보는 확인용
          보조 정보이며, 분자식과 분자량의 기준은 RDKit.js 검증 결과입니다.
        </p>
        <button
          className="secondary-action"
          data-testid="search-pubchem-candidates-button"
          type="button"
          disabled={!canSearch || status === 'searching'}
          onClick={onSearch}
        >
          {status === 'searching' ? 'PubChem 후보 검색 중' : 'PubChem 후보 검색'}
        </button>
      </div>

      <p className="pubchem-candidate-message">
        {studentMessage ??
          'RDKit.js 검증을 통과한 구조에서만 PubChem 후보 검색을 요청할 수 있습니다.'}
      </p>

      {warnings.length > 0 ? (
        <ul className="pubchem-candidate-warnings">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {candidates.length > 0 ? (
        <ol className="pubchem-candidate-list">
          {candidates.map((candidate) => (
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
                  외부 데이터 후보: {candidate.title ?? `PubChem CID ${candidate.cid}`}
                </p>
                <dl>
                  <div>
                    <dt>CID</dt>
                    <dd>{candidate.cid}</dd>
                  </div>
                  <div>
                    <dt>분자식</dt>
                    <dd>{candidate.molecularFormula ?? '제공되지 않음'}</dd>
                  </div>
                  <div>
                    <dt>분자량</dt>
                    <dd>{candidate.molecularWeight ?? '제공되지 않음'}</dd>
                  </div>
                  <div>
                    <dt>PubChem SMILES</dt>
                    <dd className="code-output">
                      {candidate.isomericSmiles ??
                        candidate.canonicalSmiles ??
                        '제공되지 않음'}
                    </dd>
                  </div>
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
                이 후보로 3D 불러오기
              </button>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
