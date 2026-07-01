import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App, resolveValidatedExampleForResult } from './App';
import { exampleMolecules } from '../data/exampleMolecules';
import type { MoleculeValidationResult } from '../types/molecule';

vi.mock('../components/editor/KetcherEditor', () => ({
  KetcherEditor: () => (
    <section className="workspace-panel editor-panel" data-testid="chemical-editor">
      <h2>분자 편집 영역</h2>
      <p>분자 그리기 도구 mock editor</p>
    </section>
  ),
  normalizeKetcherError: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

describe('App scaffold', () => {
  it('renders the student activity flow first without raw chemistry or developer details', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('다양한 분자의 분자구조 모델링');
    expect(markup).toContain('Phase 15: Classroom MVP Release Candidate');
    expect(markup).toContain('교사용 안내');
    expect(markup).toContain('오늘의 활동 선택하기');
    expect(markup).toContain('예측 입력하기');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('분자 그리기');
    expect(markup).toContain('내 구조 확인하기');
    expect(markup).toContain('확인된 값만 결과로 봅니다');
    expect(markup).toContain('입체 구조 보기');
    expect(markup).toContain('정리 작성하기');
    expect(markup).toContain('예상 입체 모형 보기');
    expect(markup).toContain('참고 3D 구조 보기');
    expect(markup).toContain('구조 비교하기');
    expect(markup).toContain('활동 결과 정리');
    expect(markup).toContain('임시 저장하기');
    expect(markup).toContain('보고서로 저장하기');
    expect(markup).toContain('활동지 인쇄하기');
    expect(markup).toContain('이 분자의 3D 자료가 아직 준비되지 않았습니다');
    expect(markup).not.toContain('구조 정보');
    expect(markup).not.toContain('Canonical SMILES');
    expect(markup).not.toContain('아직 추출된 MOL 데이터');
    expect(markup).not.toContain('Ketcher');
    expect(markup).not.toContain('RDKit.js');
    expect(markup).not.toContain('PubChem');
    expect(markup).not.toContain('CID');
    expect(markup).not.toContain('SDF');
    expect(markup).not.toContain('SMILES');
    expect(markup).not.toContain('MOL');
    expect(markup).not.toContain('JSON');
    expect(markup).not.toContain('localStorage');
    expect(markup).not.toContain('Developer log');
    expect(markup).not.toContain('실제/외부');
    expect(markup).not.toContain('개발자 로그 / 검증 결과');
    expect(markup).not.toContain('개발자 로그 보기');
    expect(markup).not.toContain('교사용 지도 패널');
    expect(markup).toContain('분자 예시 불러오기');
    expect(markup).toContain('기본 분자');
    expect(markup).toContain('유기 기초');
    expect(markup).toContain('생활 속 분자');
    expect(markup).toContain('물 (Water)');
    expect(markup).toContain('아스피린 (Aspirin)');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });

  it('keeps the selected example handoff when a matching structure is confirmed again', () => {
    const water = exampleMolecules.find((example) => example.id === 'water');
    const result = {
      ok: true,
      source: 'smiles',
      canonicalSmiles: 'O',
      smiles: 'O',
      molBlock: '',
      molecularFormula: 'H2O',
      molecularWeight: 18.015,
      warnings: [],
      errors: [],
      developerLogs: [],
      validationStatus: 'valid',
    } satisfies MoleculeValidationResult;

    expect(water).toBeDefined();
    expect(
      resolveValidatedExampleForResult({
        selectedExample: water,
        result,
      })?.id,
    ).toBe('water');
  });

  it('does not attach selected example 3D data when a drawn structure no longer matches it', () => {
    const water = exampleMolecules.find((example) => example.id === 'water');
    const result = {
      ok: true,
      source: 'smiles',
      canonicalSmiles: 'C',
      smiles: 'C',
      molBlock: '',
      molecularFormula: 'CH4',
      molecularWeight: 16.043,
      warnings: [],
      errors: [],
      developerLogs: [],
      validationStatus: 'valid',
    } satisfies MoleculeValidationResult;

    expect(water).toBeDefined();
    expect(
      resolveValidatedExampleForResult({
        selectedExample: water,
        result,
      }),
    ).toBeNull();
  });
});
