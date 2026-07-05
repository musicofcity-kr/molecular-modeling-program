import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MoleculeValidationResult } from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import { ValidationResultCards } from './ValidationResultCards';

const waterValidation: MoleculeValidationResult = {
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

const systemErrorValidation: MoleculeValidationResult = {
  ok: false,
  validationStatus: 'error',
  studentMessage: '구조 확인 도구가 응답하지 않았습니다.',
  warnings: [],
  errors: ['RDKit parse failed'],
  developerLogs: ['RDKit parse failed'],
};

const unsupportedVsepr: VseprAnalysis = {
  status: 'not_requested',
  confidence: 'low',
  warnings: [],
  studentMessage: '구조 확인 후 표시됩니다.',
};

describe('ValidationResultCards comparison view', () => {
  it('shows a positive badge when the predicted formula and molecular weight match', () => {
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        responses={{
          predictedFormula: 'H2O',
          predictedMolecularWeight: '18.015',
        }}
        validationResult={waterValidation}
        vseprAnalysis={unsupportedVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('내 예측');
    expect(markup).toContain('확인 결과');
    expect(markup).toContain('✓ 예측과 일치해요');
    expect(markup).toContain('student-comparison-value');
    expect(markup).not.toContain('오답');
    expect(markup).not.toContain('틀림');
  });

  it('uses a retry badge, not an error badge, when the prediction differs', () => {
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        responses={{
          predictedFormula: 'HO',
          predictedMolecularWeight: '20',
        }}
        validationResult={waterValidation}
        vseprAnalysis={unsupportedVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('△ 예측과 달라요 — 어디가 다른지 살펴보세요');
    expect(markup).toContain('student-comparison-badge retry');
    expect(markup).not.toContain('student-comparison-badge error');
    expect(markup).not.toContain('오답');
    expect(markup).not.toContain('틀림');
  });

  it('separates system validation errors from prediction comparison', () => {
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        responses={{
          predictedFormula: 'H2O',
          predictedMolecularWeight: '18.015',
        }}
        validationResult={systemErrorValidation}
        vseprAnalysis={unsupportedVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('구조 확인 중 문제가 생겼습니다');
    expect(markup).toContain('student-system-status-badge error');
    expect(markup).toContain('아직 구조 확인 전');
    expect(markup).not.toContain('오답');
    expect(markup).not.toContain('틀림');
  });
});
