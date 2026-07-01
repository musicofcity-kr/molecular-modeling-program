import type { Molecule3DInput, MoleculeValidationResult } from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';

type ValidationResultCardsProps = {
  validationResult: MoleculeValidationResult | null;
  vseprAnalysis: VseprAnalysis;
  molecule3DInput: Molecule3DInput | null;
};

function getStructureStatus(validationResult: MoleculeValidationResult | null): {
  label: string;
  value: string;
  tone: 'ready' | 'warning' | 'neutral';
} {
  if (validationResult?.ok === true) {
    return {
      label: '구조 확인 결과',
      value: '구조 확인 완료',
      tone: 'ready',
    };
  }

  if (validationResult?.ok === false) {
    return {
      label: '구조 확인 결과',
      value: `구조를 다시 확인해 주세요. ${validationResult.studentMessage}`,
      tone: 'warning',
    };
  }

  return {
    label: '구조 확인 결과',
    value: '아직 구조를 확인하지 않았습니다.',
    tone: 'neutral',
  };
}

function getShapePrediction(vseprAnalysis: VseprAnalysis): string {
  if (vseprAnalysis.status === 'supported') {
    return [
      vseprAnalysis.molecularShapeKo,
      vseprAnalysis.axeNotation,
    ].filter(Boolean).join(' / ');
  }

  if (vseprAnalysis.studentMessage) {
    return vseprAnalysis.studentMessage;
  }

  return '구조 확인 후 표시됩니다.';
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

export function ValidationResultCards({
  validationResult,
  vseprAnalysis,
  molecule3DInput,
}: ValidationResultCardsProps) {
  const status = getStructureStatus(validationResult);
  const isValid = validationResult?.ok === true;

  return (
    <section
      className="student-step validation-result-cards"
      data-testid="validation-result-cards"
    >
      <div className="student-step-heading">
        <span className="student-step-number">4</span>
        <div>
          <p className="section-label">내 구조 확인하기</p>
          <h2>확인된 값만 결과로 봅니다</h2>
        </div>
      </div>

      <div className="student-result-grid">
        <article className={`student-result-card ${status.tone}`}>
          <p className="section-label">{status.label}</p>
          <strong>{status.value}</strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">분자식</p>
          <strong data-testid="student-formula-output">
            {isValid ? validationResult.molecularFormula : '구조 확인 후 표시'}
          </strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">평균 분자량</p>
          <strong data-testid="student-molecular-weight-output">
            {isValid ? validationResult.molecularWeight.toFixed(3) : '구조 확인 후 표시'}
          </strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">입체 구조 예상</p>
          <strong>{getShapePrediction(vseprAnalysis)}</strong>
        </article>
        <article className="student-result-card">
          <p className="section-label">참고 3D 구조 제공 여부</p>
          <strong>{get3DAvailability(molecule3DInput)}</strong>
        </article>
      </div>
    </section>
  );
}
