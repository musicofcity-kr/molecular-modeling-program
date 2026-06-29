import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StructureInfoPanel } from './StructureInfoPanel';

describe('StructureInfoPanel', () => {
  it('shows an empty Ketcher extraction state before structure data is available', () => {
    const markup = renderToStaticMarkup(
      <StructureInfoPanel extractedStructure={null} validationResult={null} />,
    );

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
          extractedAt: '2026-06-29T00:00:00.000Z',
          validationStatus: 'unvalidated',
        }}
        validationResult={null}
      />,
    );

    expect(markup).toContain('Ketcher 추출 완료 / RDKit.js 미검증');
    expect(markup).toContain('CCO');
    expect(markup).toContain('ethanol mol block');
    expect(markup).toContain('분자식과 평균 분자량은 RDKit.js 검증 성공 후 표시합니다.');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });

  it('renders long extracted structures without chemistry calculations', () => {
    const longMolBlock = `${'C'.repeat(600)}\nM  END`;

    const markup = renderToStaticMarkup(
      <StructureInfoPanel
        extractedStructure={{
          source: 'ketcher',
          smiles: 'C'.repeat(120),
          molBlock: longMolBlock,
          extractedAt: '2026-06-29T00:00:00.000Z',
          validationStatus: 'unvalidated',
        }}
        validationResult={null}
      />,
    );

    expect(markup).toContain('Ketcher 추출 완료 / RDKit.js 미검증');
    expect(markup).toContain('M  END');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });

  it('shows only RDKit-validated chemistry outputs when validation succeeds', () => {
    const markup = renderToStaticMarkup(
      <StructureInfoPanel
        extractedStructure={{
          source: 'ketcher',
          smiles: 'CCO',
          molBlock: 'ethanol mol block',
          extractedAt: '2026-06-29T00:00:00.000Z',
          validationStatus: 'unvalidated',
        }}
        validationResult={{
          ok: true,
          validationStatus: 'valid',
          source: 'mol-block',
          smiles: 'CCO',
          molBlock: 'ethanol mol block',
          canonicalSmiles: 'CCO',
          molecularFormula: 'C2H6O',
          molecularWeight: 46.069,
          warnings: [],
          errors: [],
          developerLogs: ['RDKit validated mol-block input.'],
        }}
      />,
    );

    expect(markup).toContain('RDKit.js 검증 완료');
    expect(markup).toContain('data-testid="formula-output"');
    expect(markup).toContain('C2H6O');
    expect(markup).toContain('data-testid="molecular-weight-output"');
    expect(markup).toContain('46.069');
    expect(markup).toContain('평균 분자량');
    expect(markup).toContain('Canonical SMILES');
    expect(markup).toContain('분자식, 평균 분자량, canonical SMILES는 RDKit.js가 파싱한 구조에서 계산했습니다.');
  });

  it('hides chemistry outputs and raw structure strings when validation fails', () => {
    const markup = renderToStaticMarkup(
      <StructureInfoPanel
        extractedStructure={{
          source: 'ketcher',
          smiles: 'C1CC',
          molBlock: 'invalid mol block',
          extractedAt: '2026-06-29T00:00:00.000Z',
          validationStatus: 'unvalidated',
        }}
        validationResult={{
          ok: false,
          validationStatus: 'invalid',
          source: 'smiles',
          studentMessage:
            '현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수, 전하, 원자 표기를 확인해 주세요.',
          warnings: [],
          errors: [
            '현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수, 전하, 원자 표기를 확인해 주세요.',
          ],
          developerLogs: ['RDKit could not parse smiles input.'],
        }}
      />,
    );

    expect(markup).toContain('RDKit.js 검증 실패');
    expect(markup).toContain('현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다');
    expect(markup).toContain('검증 실패로 학생용 패널에 표시하지 않습니다.');
    expect(markup).not.toContain('C1CC');
    expect(markup).not.toContain('invalid mol block');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
    expect(markup).not.toContain('Canonical SMILES');
  });
});
