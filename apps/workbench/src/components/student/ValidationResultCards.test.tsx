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

describe('ValidationResultCards direct result view', () => {
  it('shows validated values without requiring a prediction', () => {
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        validationResult={waterValidation}
        vseprAnalysis={unsupportedVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('분자식');
    expect(markup).toContain('H2O');
    expect(markup).toContain('18.015');
    expect(markup).not.toContain('내 예측');
    expect(markup).not.toContain('예측과 일치');
  });

  it('separates system validation errors from prediction comparison', () => {
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        validationResult={systemErrorValidation}
        vseprAnalysis={unsupportedVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('구조 확인 중 문제가 생겼습니다');
    expect(markup).toContain('student-system-status-badge error');
    expect(markup).toContain('구조를 다시 확인해 주세요');
    expect(markup).not.toContain('내 예측');
  });
});
