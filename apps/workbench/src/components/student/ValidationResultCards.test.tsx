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

const disconnectedCarbonValidation: MoleculeValidationResult = {
  ok: false,
  validationStatus: 'invalid',
  source: 'smiles',
  structureIntent: 'single-molecule',
  graphSummary: {
    atomCount: 4,
    bondCount: 0,
    componentCount: 4,
    componentAtomCounts: [1, 1, 1, 1],
    isSingleComponent: false,
    isolatedAtomCount: 4,
  },
  connectivityDecision: {
    intent: 'single-molecule',
    status: 'multiple-components-blocked',
    allowed: false,
  },
  studentMessage:
    '현재 구조는 4개의 서로 떨어진 조각입니다. 원자 사이를 결합으로 연결해 주세요.',
  warnings: [],
  errors: ['disconnected graph'],
  developerLogs: ['A=4 B=0 C=4'],
};

const neutralChargeSeparatedValidation: MoleculeValidationResult = {
  ok: true,
  validationStatus: 'valid',
  source: 'smiles',
  canonicalSmiles: 'O=[O+][O-]',
  molecularFormula: 'O3',
  molecularWeight: 47.998,
  warnings: [
    '전하 분리 표기가 있지만 전체 형식전하가 0인 중성 구조입니다. 공명 표현은 교사와 함께 검토해 주세요.',
  ],
  errors: [],
  developerLogs: [],
};

const unsupportedVsepr: VseprAnalysis = {
  status: 'not_requested',
  confidence: 'low',
  warnings: [],
  studentMessage: '구조 확인 후 표시됩니다.',
};

describe('ValidationResultCards direct result view', () => {
  it('prioritizes validated chemistry and moves molecular weight into other information', () => {
    const supportedWaterVsepr: VseprAnalysis = {
      status: 'supported',
      centralAtomId: '1',
      centralAtomSymbol: 'O',
      bondedAtomCount: 2,
      lonePairCount: 2,
      stericNumber: 4,
      axeNotation: 'AX2E2',
      electronDomainGeometryKo: '정사면체',
      molecularShapeKo: '굽은형',
      idealBondAngles: ['109.5°보다 작음'],
      confidence: 'high',
      warnings: [],
    };
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        validationResult={waterValidation}
        vseprAnalysis={supportedWaterVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('분자식');
    expect(markup).toContain('H2O');
    expect(markup).toContain('선택 중심 원자');
    expect(markup).toContain('전체 전자 영역');
    expect(markup).toContain('선택 중심 주변 분자 모양');
    expect(markup).toContain('굽은형');
    expect(markup).toContain('기타 정보');
    expect(markup.indexOf('굽은형')).toBeLessThan(markup.indexOf('18.015'));
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

    expect(markup).toContain('구조 분석 중 문제가 생겼습니다');
    expect(markup).toContain('student-system-status-badge error');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('구조 확인 도구가 응답하지 않았습니다');
    expect(markup).toContain('위의 구조 안내를 확인해 주세요');
    expect(markup).not.toContain('내 예측');
  });

  it('keeps atom, bond, and component evidence visible when connectivity is blocked', () => {
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        validationResult={disconnectedCarbonValidation}
        vseprAnalysis={unsupportedVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('data-testid="molecule-graph-summary"');
    expect(markup).toContain('data-connectivity-status="multiple-components-blocked"');
    expect(markup).toContain('data-testid="graph-atom-count">4개');
    expect(markup).toContain('data-testid="graph-bond-count">0개');
    expect(markup).toContain('data-testid="graph-component-count">4개');
    expect(markup).toContain('하나의 분자를 만들려면 원자 사이를 결합으로 연결해 주세요');
    expect(markup).not.toContain('C4H16');
  });

  it('shows a neutral charge-separation warning without hiding validated values', () => {
    const markup = renderToStaticMarkup(
      <ValidationResultCards
        validationResult={neutralChargeSeparatedValidation}
        vseprAnalysis={unsupportedVsepr}
        molecule3DInput={null}
      />,
    );

    expect(markup).toContain('data-testid="student-chemistry-warning"');
    expect(markup).toContain('전체 형식전하가 0인 중성 구조');
    expect(markup).toContain('O3');
    expect(markup).toContain('47.998');
  });
});
