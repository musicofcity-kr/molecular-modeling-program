import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { activityTemplates } from '../../data/activityTemplates';
import { exampleMolecules } from '../../data/exampleMolecules';
import type { MoleculeValidationResult } from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import { StudentActivityShell } from './StudentActivityShell';
import type { LearningStepId } from './LearningProgressRail';

const validWaterResult: MoleculeValidationResult = {
  ok: true,
  validationStatus: 'valid',
  source: 'smiles',
  canonicalSmiles: 'O',
  molecularFormula: 'H2O',
  molecularWeight: 18.015,
  warnings: [],
  errors: [],
  developerLogs: [],
};

const supportedVseprAnalysis: VseprAnalysis = {
  status: 'supported',
  centralAtomId: '1',
  centralAtomSymbol: 'O',
  bondedAtomCount: 2,
  lonePairCount: 2,
  stericNumber: 4,
  axeNotation: 'AX2E2',
  electronDomainGeometryKo: '정사면체',
  molecularShapeKo: '굽은형',
  idealBondAngles: ['104.5° 부근'],
  confidence: 'high',
  warnings: [],
};

function renderShell(currentStep: LearningStepId) {
  return renderToStaticMarkup(
    <StudentActivityShell
      templates={activityTemplates}
      selectedActivityId={activityTemplates[0].id}
      responses={{
        predictedFormula: 'H2O',
        predictedMolecularWeight: '18',
        drawingReason: '산소를 중심으로 수소 두 개를 연결한다고 예상했다.',
        verificationReflection: '예측값과 확인 결과를 비교했다.',
      }}
      validationResult={validWaterResult}
      vseprAnalysis={supportedVseprAnalysis}
      molecule3DInput={null}
      examples={exampleMolecules}
      selectedExampleId={exampleMolecules[0].id}
      drawingSlot={<section data-testid="drawing-slot">분자 편집 영역</section>}
      predictionViewerSlot={<section>예상 입체 모형 보기</section>}
      actual3DViewerSlot={<section>참고 3D 구조 보기</section>}
      external3DSearchSlot={<section>외부 3D 자료 찾기</section>}
      comparisonSlot={<section id="student-step-6">구조 비교하기</section>}
      resultSlot={<section id="student-step-7">활동 결과 정리</section>}
      currentStep={currentStep}
      onSelectActivity={vi.fn()}
      onResponseChange={vi.fn()}
      onSelectExample={vi.fn()}
      onLoadExample={vi.fn()}
      onConfirmStructure={vi.fn(() => true)}
      onStepChange={vi.fn()}
    />,
  );
}

describe('StudentActivityShell wizard', () => {
  it('renders only the activity picker on step 1', () => {
    const markup = renderShell(1);

    expect(markup).toContain('id="student-step-1"');
    expect(markup).toContain('오늘의 활동 선택하기');
    expect(markup).toContain('다음: 예측 입력 →');
    expect(markup).not.toContain('id="student-step-2"');
    expect(markup).not.toContain('분자 편집 영역');
  });

  it('renders prediction inputs with existing answers on step 2', () => {
    const markup = renderShell(2);

    expect(markup).toContain('id="student-step-2"');
    expect(markup).toContain('예측 입력하기');
    expect(markup).toContain('value="H2O"');
    expect(markup).toContain('산소를 중심으로 수소 두 개를 연결한다고 예상했다.');
    expect(markup).toContain('다음: 구조 그리기 →');
    expect(markup).not.toContain('id="student-step-1"');
  });

  it('renders the drawing step and keeps structure confirmation as the next guard on step 3', () => {
    const markup = renderShell(3);

    expect(markup).toContain('id="student-step-3"');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('내 구조 확인하기');
    expect(markup).toContain('다음: 구조 확인 →');
    expect(markup).not.toContain('id="student-step-4"');
  });

  it('renders validation result cards on step 4', () => {
    const markup = renderShell(4);

    expect(markup).toContain('id="student-step-4"');
    expect(markup).toContain('구조 확인 완료');
    expect(markup).toContain('H2O');
    expect(markup).toContain('18.015');
    expect(markup).toContain('다음: 입체 구조 보기 →');
    expect(markup).not.toContain('id="student-step-3"');
  });

  it('renders only the shape viewer section on step 5 without the comparison slot', () => {
    const markup = renderShell(5);

    expect(markup).toContain('id="student-step-5"');
    expect(markup).toContain('예상 입체 모형 보기');
    expect(markup).toContain('참고 3D 구조 보기');
    expect(markup).toContain('다음: 비교 기록 →');
    expect(markup).not.toContain('id="student-step-6"');
  });

  it('renders the comparison slot on step 6', () => {
    const markup = renderShell(6);

    expect(markup).toContain('id="student-step-6"');
    expect(markup).toContain('구조 비교하기');
    expect(markup).toContain('다음: 결과 정리 →');
    expect(markup).not.toContain('id="student-step-5"');
  });

  it('renders the result slot as the final step', () => {
    const markup = renderShell(7);

    expect(markup).toContain('id="student-step-7"');
    expect(markup).toContain('활동 결과 정리');
    expect(markup).toContain('7단계까지 도착했습니다');
    expect(markup).not.toContain('다음:');
  });
});
