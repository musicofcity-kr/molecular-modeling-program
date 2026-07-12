import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { activityTemplates } from '../../data/activityTemplates';
import { exampleMolecules } from '../../data/exampleMolecules';
import type { MoleculeValidationResult } from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import { StudentActivityShell } from './StudentActivityShell';

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

function renderShell() {
  return renderToStaticMarkup(
    <StudentActivityShell
      templates={activityTemplates}
      selectedActivityId={activityTemplates[0].id}
      validationResult={validWaterResult}
      vseprAnalysis={supportedVseprAnalysis}
      molecule3DInput={null}
      examples={exampleMolecules}
      selectedExampleId={exampleMolecules[0].id}
      drawingSlot={<section data-testid="drawing-slot">분자 편집 영역</section>}
      predictionViewerSlot={<section>예상 입체 모형 보기</section>}
      actual3DViewerSlot={<section>참고 3D 구조 보기</section>}
      external3DSearchSlot={<section>외부 3D 자료 찾기</section>}
      thoughtValue="입체 모형을 보고 생각을 정리했습니다."
      submissionStatusMessage=""
      canSubmitThought
      isSubmittingThought={false}
      onSelectActivity={vi.fn()}
      onSelectExample={vi.fn()}
      onLoadExample={vi.fn()}
      onConfirmStructure={vi.fn(() => true)}
      onThoughtChange={vi.fn()}
      onSubmitThought={vi.fn()}
    />,
  );
}

describe('StudentActivityShell direct workbench', () => {
  it('renders the core modeling tools together without a staged wizard', () => {
    const markup = renderShell();

    expect(markup).toContain('분자 선택');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('구조 확인 완료');
    expect(markup).toContain('H2O');
    expect(markup).toContain('18.015');
    expect(markup).toContain('예상 입체 모형 보기');
    expect(markup.indexOf('예상 입체 모형 보기')).toBeLessThan(
      markup.indexOf('나의 생각 정리'),
    );
    expect(markup).toContain('입체 모형을 보고 생각을 정리했습니다.');
    expect(markup).toContain('교사에게 제출하기');
    expect(markup).toContain('참고 3D 구조 보기');
    expect(markup).not.toContain('예측 입력하기');
    expect(markup).not.toContain('정리 작성하기');
    expect(markup).not.toContain('student-wizard-action-bar');
    expect(markup).not.toContain('구조 비교하기');
    expect(markup).not.toContain('활동 결과 정리');
  });
});
