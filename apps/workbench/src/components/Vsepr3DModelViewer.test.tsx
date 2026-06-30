import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Vsepr3DModelViewer } from './Vsepr3DModelViewer';

const waterAnalysis = {
  status: 'supported' as const,
  centralAtomId: '1',
  centralAtomSymbol: 'O',
  bondedAtomCount: 2,
  lonePairCount: 2,
  stericNumber: 4,
  axeNotation: 'AX2E2',
  electronDomainGeometryKo: '정사면체',
  molecularShapeKo: '굽은형',
  idealBondAngles: ['<109.5°'],
  confidence: 'medium' as const,
  warnings: [],
};

describe('Vsepr3DModelViewer', () => {
  it('labels the viewer as an educational prediction model, not external 3D coordinates', () => {
    const markup = renderToStaticMarkup(
      <Vsepr3DModelViewer analysis={waterAnalysis} modelStatus="ready" />,
    );

    expect(markup).toContain('VSEPR 예측 모형');
    expect(markup).toContain('교육용 예측 모형');
    expect(markup).toContain('PubChem 3D 구조와 구분합니다.');
    expect(markup).toContain('실제 결합길이 측정값이 아닙니다.');
    expect(markup).toContain('라벨 표시');
  });

  it('shows rendered model metadata when a supported template is requested', () => {
    const markup = renderToStaticMarkup(
      <Vsepr3DModelViewer analysis={waterAnalysis} modelStatus="rendered" />,
    );

    expect(markup).toContain('AX2E2 VSEPR 교육용 예측 모형을 표시합니다.');
    expect(markup).toContain('AX2E2');
    expect(markup).toContain('&lt;109.5° 이상화 각도');
    expect(markup).toContain('비공유 전자쌍');
  });

  it('blocks unsupported VSEPR output from being shown as a model', () => {
    const markup = renderToStaticMarkup(
      <Vsepr3DModelViewer
        analysis={{
          status: 'unsupported',
          centralAtomSymbol: 'Fe',
          confidence: 'low',
          warnings: ['지원하지 않는 중심 원소입니다: Fe'],
        }}
        modelStatus="unsupported"
      />,
    );

    expect(markup).toContain('지원하지 않음');
    expect(markup).toContain('지원되는 구조에서만 교육용 3D 예측 모형을 표시합니다.');
    expect(markup).not.toContain('PubChem 제공 구조');
  });
});
