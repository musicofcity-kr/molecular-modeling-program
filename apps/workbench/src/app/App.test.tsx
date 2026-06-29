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
  it('renders the Ketcher integration regions without RDKit results', () => {
    const markup = renderToStaticMarkup(<App />);

    expect(markup).toContain('Molecule Modeling Workbench');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('구조 정보');
    expect(markup).toContain('로그 / 검증 결과');
    expect(markup).toContain('구조 검증하기');
    expect(markup).toContain('RDKit.js 미검증');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });
});
