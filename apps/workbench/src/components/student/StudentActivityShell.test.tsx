import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { activityTemplates } from '../../data/activityTemplates';
import { exampleMolecules } from '../../data/exampleMolecules';
import type {
  Molecule3DInput,
  MoleculeValidationResult,
} from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import {
  confirmStudentStructureAndAdvance,
  StudentActivityShell,
} from './StudentActivityShell';

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

const water3DInput: Molecule3DInput = {
  format: 'sdf',
  data: 'water 3D coordinates',
  label: '물',
  sourceType: 'static-example',
  coordinateDimension: '3d',
  coordinateSource: 'test fixture',
};

function renderShell({
  submissionStatusMessage = '',
  isThoughtSubmitted = false,
  hasVisitedCurrent3DStep = false,
}: {
  submissionStatusMessage?: string;
  isThoughtSubmitted?: boolean;
  hasVisitedCurrent3DStep?: boolean;
} = {}) {
  return renderToStaticMarkup(
    <StudentActivityShell
      templates={activityTemplates}
      selectedActivityId={activityTemplates[0].id}
      validationResult={validWaterResult}
      vseprAnalysis={supportedVseprAnalysis}
      molecule3DInput={water3DInput}
      examples={exampleMolecules}
      selectedExampleId={exampleMolecules[0].id}
      drawingSlot={<section data-testid="drawing-slot">분자 편집 영역</section>}
      predictionViewerSlot={<section>예상 입체 모형 보기</section>}
      actual3DViewerSlot={<section>참고 3D 구조 보기</section>}
      external3DSearchSlot={<section>외부 3D 자료 찾기</section>}
      thoughtValue="입체 모형을 보고 생각을 정리했습니다."
      submissionStatusMessage={submissionStatusMessage}
      isThoughtSubmitted={isThoughtSubmitted}
      hasVisitedCurrent3DStep={hasVisitedCurrent3DStep}
      canSubmitThought
      isSubmittingThought={false}
      thoughtSubmissionAvailabilityMessage="교사에게 제출할 수 있습니다."
      onSelectActivity={vi.fn()}
      onSelectExample={vi.fn()}
      onLoadExample={vi.fn()}
      onConfirmStructure={vi.fn(() => true)}
      onVisitCurrent3DStep={vi.fn()}
      onThoughtChange={vi.fn()}
      onSubmitThought={vi.fn()}
    />,
  );
}

describe('StudentActivityShell learning flow', () => {
  it('advances after an explicit completed analysis and stays put on tool failure', async () => {
    const advanceToAnalysis = vi.fn();
    const successfulAnalysis = vi.fn().mockResolvedValue(true);
    const failedAnalysis = vi.fn().mockResolvedValue(false);

    await expect(
      confirmStudentStructureAndAdvance(
        successfulAnalysis,
        advanceToAnalysis,
      ),
    ).resolves.toBe(true);
    expect(advanceToAnalysis).toHaveBeenCalledTimes(1);

    advanceToAnalysis.mockClear();

    await expect(
      confirmStudentStructureAndAdvance(failedAnalysis, advanceToAnalysis),
    ).resolves.toBe(false);
    expect(advanceToAnalysis).not.toHaveBeenCalled();
  });

  it('renders five freely navigable learning stages without locking the tools', () => {
    const markup = renderShell();

    expect(markup).toContain('오늘의 탐구 흐름');
    expect(markup).toContain('learning-progress-rail');
    expect(markup).toContain('student-mobile-step-nav');
    expect(markup).toContain('분자 선택');
    expect(markup).toContain('구조 만들기');
    expect(markup).toContain('구조 분석');
    expect(markup).toContain('3D 비교');
    expect(markup).toContain('생각 정리·제출');
    expect(markup).toContain('1 / 5');
    expect(markup).toContain('분자 선택');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('분석할 수 있는 구조입니다');
    expect(markup).toContain('H2O');
    expect(markup).toContain('18.015');
    expect(markup).toContain('예상 입체 모형 보기');
    expect(markup.indexOf('예상 입체 모형 보기')).toBeLessThan(
      markup.indexOf('나의 판단과 근거'),
    );
    expect(markup).toContain('입체 모형을 보고 생각을 정리했습니다.');
    expect(markup).toContain('교사에게 제출하기');
    expect(markup).toContain('참고 3D 구조 보기');
    expect(markup).toContain('두 모형의 공통점과 차이점');
    expect(markup).toContain('단계 잠금 없이 이동할 수 있습니다');
    expect(markup).not.toContain('예측 입력하기');
    expect(markup).not.toContain('정리 작성하기');
    expect(markup).not.toContain('student-wizard-action-bar');
    expect(markup).not.toContain('구조 비교하기');
    expect(markup).not.toContain('활동 결과 정리');
  });

  it('marks submission complete only for an explicitly confirmed current submission', () => {
    const failureMarkup = renderShell({
      submissionStatusMessage: '서버 제출함 요청을 보내지 못했습니다.',
    });
    const successMarkup = renderShell({
      submissionStatusMessage: '활동 결과를 서버 제출함에 저장했습니다.',
      isThoughtSubmitted: true,
    });

    expect(failureMarkup).toMatch(
      /data-testid="learning-step-5" data-status="review"/,
    );
    expect(successMarkup).toMatch(
      /data-testid="learning-step-5" data-status="completed"/,
    );
  });

  it('keeps 3D comparison in review until the current structure step is visited', () => {
    const beforeVisitMarkup = renderShell();
    const afterVisitMarkup = renderShell({
      hasVisitedCurrent3DStep: true,
    });

    expect(beforeVisitMarkup).toMatch(
      /data-testid="learning-step-4" data-status="review"/,
    );
    expect(afterVisitMarkup).toMatch(
      /data-testid="learning-step-4" data-status="completed"/,
    );
  });
});
