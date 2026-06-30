import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './App';

vi.mock('../components/editor/KetcherEditor', () => ({
  KetcherEditor: () => (
    <section className="workspace-panel editor-panel" data-testid="chemical-editor">
      <h2>분자 편집 영역</h2>
      <p>Ketcher mock editor</p>
    </section>
  ),
  normalizeKetcherError: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}));

describe('App scaffold', () => {
  it('renders the Ketcher extraction and RDKit validation regions without calculated results', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('Molecule Modeling Workbench');
    expect(markup).toContain('Phase 7: PubChem CID 3D 프로토타입');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('구조 정보');
    expect(markup).toContain('3D Viewer');
    expect(markup).toContain('3D 좌표 데이터가 아직 없습니다');
    expect(markup).toContain('PubChem 3D');
    expect(markup).toContain('PubChem 3D 불러오기');
    expect(markup).toContain(
      'PubChem 3D를 불러오려면 먼저 이 예제를 불러와 RDKit.js 검증을 완료해 주세요.',
    );
    expect(markup).toContain('로그 / 검증 결과');
    expect(markup).toContain('예제 불러오기');
    expect(markup).toContain('기본 분자');
    expect(markup).toContain('유기 기초');
    expect(markup).toContain('생활 속 분자');
    expect(markup).toContain('물 (Water)');
    expect(markup).toContain('아스피린 (Aspirin)');
    expect(markup).toContain('구조 검증하기');
    expect(markup).toContain('RDKit.js 미검증');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });
});
