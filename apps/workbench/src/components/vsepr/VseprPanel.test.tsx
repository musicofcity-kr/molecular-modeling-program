import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { VseprPanel } from './VseprPanel';

describe('VseprPanel', () => {
  it('shows a blocked state before VSEPR analysis is available', () => {
    const markup = renderToStaticMarkup(
      <VseprPanel
        analysis={{
          status: 'not_requested',
          confidence: 'low',
          warnings: [],
          studentMessage:
            'RDKit.js 검증을 통과한 MOL block이 있을 때 VSEPR 예측을 실행할 수 있습니다.',
        }}
        onSelectCentralAtom={() => {}}
      />,
    );

    expect(markup).toContain('분자 구조 예측');
    expect(markup).toContain('대기');
    expect(markup).toContain('교육용 예측');
    expect(markup).toContain('VSEPR 모형 보기');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('RDKit.js 검증을 통과한 MOL block');
    expect(markup).not.toContain('AX2E2');
  });

  it('renders supported VSEPR output and warnings', () => {
    const markup = renderToStaticMarkup(
      <VseprPanel
        analysis={{
          status: 'supported',
          centralAtomId: '1',
          centralAtomSymbol: 'O',
          centralAtomCandidates: [
            {
              atomId: '1',
              atomSymbol: 'O',
              atomLabel: 'O1',
              bondedAtomCount: 2,
              explicitBondedAtomCount: 0,
              inferredHydrogenCount: 2,
            },
          ],
          bondedAtomCount: 2,
          lonePairCount: 2,
          stericNumber: 4,
          axeNotation: 'AX2E2',
          electronDomainGeometryKo: '정사면체',
          molecularShapeKo: '굽은형',
          idealBondAngles: ['<109.5°'],
          confidence: 'medium',
          warnings: [
            '2D MOL block에서 생략된 수소를 일반 원자가 규칙으로 추정했습니다.',
          ],
        }}
        selectedCentralAtomId="1"
        canShowModel
        modelStatus="ready"
        onSelectCentralAtom={() => {}}
      />,
    );

    expect(markup).toContain('AX2E2');
    expect(markup).toContain('정사면체');
    expect(markup).toContain('굽은형');
    expect(markup).toContain('&lt;109.5°');
    expect(markup).toContain('중간');
    expect(markup).toContain('생략된 수소');
    expect(markup).not.toContain('disabled=""');
  });

  it('does not show confident geometry when the structure is unsupported', () => {
    const markup = renderToStaticMarkup(
      <VseprPanel
        analysis={{
          status: 'unsupported',
          centralAtomId: '1',
          centralAtomSymbol: 'Fe',
          bondedAtomCount: 1,
          confidence: 'low',
          warnings: ['지원하지 않는 중심 원소입니다: Fe'],
          studentMessage:
            '선택한 중심 원자는 현재 VSEPR MVP 규칙으로 안정적으로 예측하기 어렵습니다.',
        }}
        onSelectCentralAtom={() => {}}
      />,
    );

    expect(markup).toContain('검토 필요');
    expect(markup).toContain('지원하지 않는 중심 원소입니다: Fe');
    expect(markup).toContain('아직 예측되지 않음');
    expect(markup).not.toContain('AX6');
  });
});
