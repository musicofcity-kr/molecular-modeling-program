import type { VseprAnalysis, VseprModelViewStatus } from '../../types/vsepr';

type VseprPanelProps = {
  analysis: VseprAnalysis;
  selectedCentralAtomId?: string;
  onSelectCentralAtom: (atomId: string) => void;
  canShowModel?: boolean;
  modelStatus?: VseprModelViewStatus;
  modelButtonLabel?: string;
  renderedModelButtonLabel?: string;
  onShowModel?: () => void;
};

function formatStatus(status: VseprAnalysis['status']): string {
  switch (status) {
    case 'not_requested':
      return '대기';
    case 'needs_central_atom':
      return '중심 원자 선택 필요';
    case 'supported':
      return '예측 가능';
    case 'unsupported':
      return '검토 필요';
    case 'error':
      return '분석 오류';
  }
}

function formatConfidence(confidence: VseprAnalysis['confidence']): string {
  switch (confidence) {
    case 'high':
      return '높음';
    case 'medium':
      return '중간';
    case 'low':
      return '낮음';
  }
}

export function VseprPanel({
  analysis,
  selectedCentralAtomId,
  onSelectCentralAtom,
  canShowModel = false,
  modelStatus = 'not_requested',
  modelButtonLabel = '예상 입체 모형 보기',
  renderedModelButtonLabel = '예상 입체 모형 표시 중',
  onShowModel,
}: VseprPanelProps) {
  const candidates = analysis.centralAtomCandidates ?? [];
  const canSelectCenter = candidates.length > 0;
  const selectedCenterLabel =
    analysis.centralAtomLabel ??
    (analysis.centralAtomSymbol && analysis.centralAtomId
      ? `${analysis.centralAtomSymbol}${analysis.centralAtomId}`
      : analysis.centralAtomSymbol);
  const vseprIdealAngles =
    analysis.angleEvidence?.vseprIdealAngles ?? analysis.idealBondAngles;

  return (
    <section className="workspace-panel vsepr-panel" data-testid="vsepr-panel">
      <div className="panel-heading vsepr-heading">
        <div>
          <p className="section-label">VSEPR 근거표</p>
          <h2>선택한 중심 원자 주변의 전자 영역과 모양을 추론합니다</h2>
        </div>
        <span className={`status-pill ${analysis.status}`}>
          {formatStatus(analysis.status)}
        </span>
      </div>

      <p className="vsepr-notice">
        2D 구조식은 원자의 연결 관계를 나타냅니다. VSEPR 모형은 선택한 중심 원자
        주변의 이상적인 입체 배치를 따로 보여 주는 교육용 예측입니다.
      </p>

      <div className="vsepr-model-action">
        <p>
          예상 입체 모형은 실제 3D 자료가 아니라 선택한 중심 원자 주변 전자쌍
          방향을 이해하기 위한 단위 벡터 모형입니다.
        </p>
        <button
          className="secondary-action"
          data-testid="show-vsepr-model-button"
          type="button"
          disabled={!canShowModel}
          onClick={onShowModel}
        >
          {modelStatus === 'rendered' ? renderedModelButtonLabel : modelButtonLabel}
        </button>
      </div>

      {canSelectCenter ? (
        <label className="vsepr-center-picker">
          <span>선택 중심 원자</span>
          <select
            data-testid="vsepr-center-select"
            value={selectedCentralAtomId ?? analysis.centralAtomId ?? ''}
            onChange={(event) => {
              onSelectCentralAtom(event.currentTarget.value);
            }}
          >
            <option value="">중심 원자 선택</option>
            {candidates.map((candidate) => (
              <option key={candidate.atomId} value={candidate.atomId}>
                {candidate.atomLabel} - 결합 원자 {candidate.bondedAtomCount}개
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <dl className="vsepr-result-grid">
        <div>
          <dt>선택 중심 원자</dt>
          <dd data-testid="vsepr-central-atom-output">
            {selectedCenterLabel ?? '아직 예측되지 않음'}
          </dd>
        </div>
        <div>
          <dt>결합 전자 영역 수</dt>
          <dd data-testid="vsepr-bonding-domain-output">
            {analysis.bondedAtomCount ?? '아직 예측되지 않음'}
          </dd>
        </div>
        <div>
          <dt>비공유 전자쌍 수</dt>
          <dd data-testid="vsepr-lone-pair-output">
            {analysis.lonePairCount ?? '아직 예측되지 않음'}
          </dd>
        </div>
        <div>
          <dt>전체 전자 영역 수</dt>
          <dd data-testid="vsepr-total-domain-output">
            {analysis.stericNumber ?? '아직 예측되지 않음'}
          </dd>
        </div>
        <div>
          <dt>전자쌍 배열</dt>
          <dd data-testid="vsepr-electron-geometry-output">
            {analysis.electronDomainGeometryKo ?? '아직 예측되지 않음'}
          </dd>
        </div>
        <div>
          <dt>선택 중심 주변 분자 모양</dt>
          <dd data-testid="vsepr-molecular-shape-output">
            {analysis.molecularShapeKo ?? '아직 예측되지 않음'}
          </dd>
        </div>
        <div>
          <dt>VSEPR 이상각(이론)</dt>
          <dd data-testid="vsepr-bond-angle-output">
            {vseprIdealAngles?.join(', ') ?? '아직 예측되지 않음'}
          </dd>
        </div>
      </dl>
      <details className="student-secondary-details vsepr-secondary-details">
        <summary>모형 표기와 분석 범위</summary>
        <dl>
          <div>
            <dt>전자쌍 모형 표기</dt>
            <dd>{analysis.axeNotation ?? '아직 예측되지 않음'}</dd>
          </div>
          <div>
            <dt>확인 수준</dt>
            <dd>{formatConfidence(analysis.confidence)}</dd>
          </div>
        </dl>
      </details>

      {analysis.studentMessage ? (
        <p className="vsepr-student-message">{analysis.studentMessage}</p>
      ) : null}

      {analysis.warnings.length > 0 ? (
        <ul className="vsepr-warning-list">
          {analysis.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
