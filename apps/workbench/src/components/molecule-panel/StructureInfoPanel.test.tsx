import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StructureInfoPanel } from './StructureInfoPanel';
import type { MoleculeValidationResult } from '../../chemistry/structure-types';

describe('StructureInfoPanel', () => {
  it('hides chemistry outputs when validation fails', () => {
    const failedResult: MoleculeValidationResult = {
      ok: false,
      warnings: [],
      errors: ['현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다.'],
      developerLogs: ['RDKit could not parse smiles input.'],
    };

    const markup = renderToStaticMarkup(
      <StructureInfoPanel
        extractedStructure={{
          source: 'ketcher',
          smiles: 'C1CC',
          molfile: 'invalid molfile',
          extractedAt: '2026-06-29T00:00:00.000Z',
          validationStatus: 'rdkit-not-run',
        }}
        validationResult={failedResult}
      />,
    );

    expect(markup).toContain('현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다.');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
    expect(markup).not.toContain('Canonical SMILES');
    expect(markup).not.toContain('C1CC');
    expect(markup).not.toContain('invalid molfile');
  });

  it('shows chemistry outputs only for a successful RDKit result', () => {
    const validResult: MoleculeValidationResult = {
      ok: true,
      source: 'smiles',
      canonicalSmiles: 'CCO',
      formula: 'C2H6O',
      molecularWeight: 46.069,
      warnings: [],
      errors: [],
      developerLogs: ['RDKit validated smiles input.'],
    };

    const markup = renderToStaticMarkup(
      <StructureInfoPanel extractedStructure={null} validationResult={validResult} />,
    );

    expect(markup).toContain('RDKit.js 검증 완료');
    expect(markup).toContain('C2H6O');
    expect(markup).toContain('46.069');
    expect(markup).toContain('CCO');
  });
});
