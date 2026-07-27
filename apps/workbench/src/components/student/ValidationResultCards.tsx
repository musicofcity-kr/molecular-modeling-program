import type {
  Molecule3DInput,
  MoleculeValidationResult,
} from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

type ValidationResultCardsProps = {
  validationResult: MoleculeValidationResult | null;
  vseprAnalysis: VseprAnalysis;
  molecule3DInput: Molecule3DInput | null;
  collapsible?: boolean;
};

function getStructureStatus(validationResult: MoleculeValidationResult | null): {
  label: string;
  value: string;
  tone: 'ready' | 'warning' | 'neutral';
} {
  if (validationResult?.ok === true) {
    return {
      label: '구조 분석 결과',
      value: '분석할 수 있는 구조입니다.',
      tone: 'ready',
    };
  }

  if (validationResult?.ok === false) {
    return {
      label: '구조 분석 결과',
      value: '계산값을 표시하지 않았습니다. 위의 구조 안내를 확인해 주세요.',
      tone: 'warning',
    };
  }

  return {
    label: '구조 분석 결과',
    value: '아직 2D 구조를 분석하지 않았습니다.',
    tone: 'neutral',
  };
}

function getShapePrediction(vseprAnalysis: VseprAnalysis): string {
  if (vseprAnalysis.status === 'supported') {
    return vseprAnalysis.molecularShapeKo ?? '구조 분석 후 표시';
  }

  if (vseprAnalysis.studentMessage) {
    return vseprAnalysis.studentMessage;
  }

  return '구조 분석 후 표시';
}

function get3DAvailability(molecule3DInput: Molecule3DInput | null): string {
  if (!molecule3DInput) {
    return '이 분자의 3D 자료가 아직 준비되지 않았습니다.';
  }

  if (molecule3DInput.coordinateDimension !== '3d') {
    return '참고 3D 자료로 확인된 데이터가 아닙니다.';
  }

  if (molecule3DInput.sourceType === 'pubchem') {
    return '외부 3D 자료 제공';
  }

  if (molecule3DInput.sourceType === 'static-example') {
    return '예제 내장 3D 자료 제공';
  }

  return '참고 3D 자료 제공';
}

function getSystemStatusBadge(validationResult: MoleculeValidationResult | null): {
  label: string;
  tone: 'error' | 'warning' | 'neutral';
} | null {
  if (validationResult?.ok !== false) {
    return null;
  }

  if (validationResult.validationStatus === 'error') {
    return {
      label: '구조 분석 중 문제가 생겼습니다',
      tone: 'error',
    };
  }

  return {
    label: '구조를 다시 확인해 주세요',
    tone: 'warning',
  };
}

function getConnectivityGuidance(
  validationResult: MoleculeValidationResult,
): string {
  const decision = validationResult.connectivityDecision;

  if (decision?.status === 'multiple-components-blocked') {
    return '하나의 분자를 만들려면 원자 사이를 결합으로 연결해 주세요.';
  }

  if (decision?.status === 'multiple-components-allowed') {
    return '이 활동은 여러 구조 조각을 함께 다루도록 설정되어 있습니다.';
  }

  if (decision?.status === 'single-component') {
    return '모든 원자가 하나의 연결된 구조를 이룹니다.';
  }

  return '아직 연결된 원자 구조가 없습니다.';
}

export function ValidationResultCards({
  validationResult,
  vseprAnalysis,
  molecule3DInput,
  collapsible,
}: ValidationResultCardsProps) {
  const status = getStructureStatus(validationResult);
  const isValid = validationResult?.ok === true;
  const isSupported = isValid && vseprAnalysis.status === 'supported';
  const systemStatusBadge = getSystemStatusBadge(validationResult);
  const graphSummary = validationResult?.graphSummary;
  const connectivityStatus =
    validationResult?.connectivityDecision?.status ??
    (graphSummary?.isSingleComponent ? 'single-component' : 'empty');

  return (
    <CollapsibleStudentStep
      id="student-step-3"
      className="student-step validation-result-cards"
      testId="validation-result-cards"
      sectionLabel="구조 분석"
      title="검증된 구조에서 학습에 필요한 값을 확인합니다"
      collapsible={collapsible}
    >
      {validationResult && graphSummary ? (
        <section
          className={`molecule-graph-summary ${connectivityStatus}`}
          data-testid="molecule-graph-summary"
          data-connectivity-status={connectivityStatus}
          aria-label="분자 그래프 연결 상태"
        >
          <div>
            <p className="section-label">연결 상태 근거</p>
            <strong>{getConnectivityGuidance(validationResult)}</strong>
          </div>
          <dl>
            <div>
              <dt>원자</dt>
              <dd data-testid="graph-atom-count">{graphSummary.atomCount}개</dd>
            </div>
            <div>
              <dt>결합</dt>
              <dd data-testid="graph-bond-count">{graphSummary.bondCount}개</dd>
            </div>
            <div>
              <dt>연결된 구조 조각</dt>
              <dd data-testid="graph-component-count">
                {graphSummary.componentCount}개
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
      {systemStatusBadge ? (
        <div
          className={`student-system-status-badge ${systemStatusBadge.tone}`}
          role="alert"
          aria-live="assertive"
        >
          <strong>{systemStatusBadge.label}</strong>
          <p>{validationResult?.ok === false ? validationResult.studentMessage : ''}</p>
        </div>
      ) : null}
      {validationResult?.warnings.length ? (
        <div
          className="student-chemistry-warning"
          data-testid="student-chemistry-warning"
          role="status"
        >
          <strong>구조 해석 참고</strong>
          <ul>
            {validationResult.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div
        className="student-result-grid"
        data-testid="student-analysis-summary"
        role="status"
        aria-live="polite"
      >
        <article className={`student-result-card ${status.tone}`}>
          <p className="section-label">{status.label}</p>
          <strong>{status.value}</strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">분자식</p>
          <strong data-testid="student-formula-output">
            {isValid ? validationResult.molecularFormula : '구조 분석 후 표시'}
          </strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">선택 중심 원자</p>
          <strong data-testid="student-central-atom-output">
            {isSupported
              ? (vseprAnalysis.centralAtomLabel ??
                vseprAnalysis.centralAtomSymbol)
              : '구조 분석 후 표시'}
          </strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">선택 중심 주변 전체 전자 영역</p>
          <strong data-testid="student-electron-domain-count-output">
            {isSupported ? `${vseprAnalysis.stericNumber}개` : '구조 분석 후 표시'}
          </strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">전자쌍 배열</p>
          <strong data-testid="student-electron-geometry-output">
            {isSupported
              ? vseprAnalysis.electronDomainGeometryKo
              : '구조 분석 후 표시'}
          </strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">선택 중심 주변 분자 모양</p>
          <strong data-testid="student-molecular-shape-output">
            {isValid ? getShapePrediction(vseprAnalysis) : '구조 분석 후 표시'}
          </strong>
        </article>
      </div>
      <details className="student-secondary-details">
        <summary>기타 정보</summary>
        <dl>
          <div>
            <dt>평균 분자량</dt>
            <dd data-testid="student-molecular-weight-output">
              {isValid
                ? validationResult.molecularWeight.toFixed(3)
                : '구조 분석 후 표시'}
            </dd>
          </div>
          <div>
            <dt>전자쌍 모형 표기</dt>
            <dd>{isSupported ? vseprAnalysis.axeNotation : '구조 분석 후 표시'}</dd>
          </div>
          <div>
            <dt>참고 3D 구조 제공 여부</dt>
            <dd>{get3DAvailability(molecule3DInput)}</dd>
          </div>
        </dl>
      </details>
    </CollapsibleStudentStep>
  );
}
