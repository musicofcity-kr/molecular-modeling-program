import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  getVsepr3DStudentMessage,
  hasRenderableVseprViewerSize,
  Vsepr3DModelViewer,
} from './Vsepr3DModelViewer';

const waterAnalysis = {
  status: 'supported' as const,
  scope: 'local-center' as const,
  centralAtomId: '1',
  centralAtomSymbol: 'O',
  centralAtomLabel: 'O1',
  bondedAtomCount: 2,
  lonePairCount: 2,
  stericNumber: 4,
  axeNotation: 'AX2E2',
  electronDomainGeometryKo: '정사면체',
  molecularShapeKo: '굽은형',
  idealBondAngles: ['<109.5°'],
  angleEvidence: {
    vseprIdealAngles: ['<109.5°'],
  },
  confidence: 'medium' as const,
  warnings: [],
};

describe('Vsepr3DModelViewer', () => {
  it('requires a nonzero host before marking a VSEPR model as rendered', () => {
    expect(hasRenderableVseprViewerSize(null)).toBe(false);
    expect(
      hasRenderableVseprViewerSize({ clientWidth: 0, clientHeight: 360 }),
    ).toBe(false);
    expect(
      hasRenderableVseprViewerSize({ clientWidth: 420, clientHeight: 0 }),
    ).toBe(false);
    expect(
      hasRenderableVseprViewerSize({ clientWidth: 420, clientHeight: 360 }),
    ).toBe(true);
  });

  it('labels the viewer as an educational prediction model, not external 3D coordinates', () => {
    const markup = renderToStaticMarkup(
      <Vsepr3DModelViewer analysis={waterAnalysis} modelStatus="ready" />,
    );

    expect(markup).toContain('예상 입체 모형');
    expect(markup).toContain('O1 주변');
    expect(markup).toContain('교육용 예측 모형');
    expect(markup).toContain('외부 3D 자료와 구분합니다.');
    expect(markup).toContain('실제 결합길이 측정값이 아닙니다.');
    expect(markup).toContain('라벨 표시');
    expect(markup).toContain('전자쌍 배열 보기');
    expect(markup).toContain('원자만 보기');
    expect(markup).toContain('비공유 전자쌍 표시');
    expect(markup).toContain('초기 방향');
    expect(markup).toContain('화면에 맞추기');
    expect(markup).toContain('한 손가락으로 회전');
  });

  it('shows rendered model metadata when a supported template is requested', () => {
    const markup = renderToStaticMarkup(
      <Vsepr3DModelViewer analysis={waterAnalysis} modelStatus="rendered" />,
    );

    expect(markup).toContain('3D 구조 보기를 준비하는 중입니다.');
    expect(markup).not.toContain(
      'O1 주변 AX2E2 전자쌍 반발 교육용 예측 모형을 표시합니다.',
    );
    expect(markup).toContain('data-viewer-status="loading"');
    expect(markup).toContain('data-model-rendered="false"');
    expect(markup).toContain('AX2E2');
    expect(markup).toContain('VSEPR 이상각(이론)');
    expect(markup).toContain('&lt;109.5°');
    expect(markup).toContain('비공유 전자쌍');
  });

  it('shows a friendly viewer error instead of claiming that the model is displayed', () => {
    const message = getVsepr3DStudentMessage({
      analysis: waterAnalysis,
      modelStatus: 'rendered',
      hasTemplate: true,
      viewerStatus: 'error',
      modelRendered: false,
    });

    expect(message).toContain('3D 예측 모형을 표시하지 못했습니다.');
    expect(message).toContain('2D 구조 분석 결과는 계속 확인할 수 있습니다.');
    expect(message).not.toContain('표시합니다.');
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
