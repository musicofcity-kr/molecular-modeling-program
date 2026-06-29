import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StructureInfoPanel } from './StructureInfoPanel';

describe('StructureInfoPanel', () => {
  it('shows an empty Ketcher extraction state before structure data is available', () => {
    const markup = renderToStaticMarkup(<StructureInfoPanel extractedStructure={null} />);

    expect(markup).toContain('구조 데이터 추출 전 / RDKit.js 미검증');
    expect(markup).toContain('아직 추출된 SMILES가 없습니다.');
    expect(markup).toContain('아직 추출된 MOL 데이터가 없습니다.');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
    expect(markup).not.toContain('Canonical SMILES');
  });

  it('shows extracted SMILES and MOL data without chemistry calculations', () => {
    const markup = renderToStaticMarkup(
      <StructureInfoPanel
        extractedStructure={{
          source: 'ketcher',
          smiles: 'CCO',
          molBlock: 'ethanol mol block',
          molfile: 'ethanol mol block',
          extractedAt: '2026-06-29T00:00:00.000Z',
          validationStatus: 'unvalidated',
        }}
      />,
    );

    expect(markup).toContain('Ketcher 추출 완료 / RDKit.js 미검증');
    expect(markup).toContain('CCO');
    expect(markup).toContain('ethanol mol block');
    expect(markup).toContain('화학 계산과 분자량 표시는 아직 실행하지 않습니다.');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });
});
