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
    expect(markup).toContain('Phase 11: 학생/교사 모드 분리 MVP');
    expect(markup).toContain('학생 모드');
    expect(markup).toContain('교사 모드');
    expect(markup).toContain('자유 그리기');
    expect(markup).toContain('수업 활동');
    expect(markup).toContain('분자 편집 영역');
    expect(markup).toContain('구조 정보');
    expect(markup).toContain('VSEPR 예측 모듈');
    expect(markup).toContain('VSEPR 예측 모듈 열기');
    expect(markup).toContain('수업 활동 또는 사용자가 명시적으로');
    expect(markup).not.toContain('분자 구조 예측');
    expect(markup).not.toContain('VSEPR 결과는 전자쌍 반발 이론에 따른 교육용 예측입니다.');
    expect(markup).not.toContain('VSEPR 예측 모형');
    expect(markup).not.toContain('PubChem 3D 구조와 구분합니다.');
    expect(markup).toContain('PubChem 후보 검색');
    expect(markup).toContain('외부 데이터베이스에서 3D 구조 후보를 찾아봅니다.');
    expect(markup).toContain('RDKit.js 검증을 통과한 구조에서만');
    expect(markup).toContain('실제/외부 3D 구조 Viewer');
    expect(markup).toContain('3D 좌표 데이터가 아직 없습니다');
    expect(markup).toContain('PubChem 3D');
    expect(markup).toContain('PubChem 3D 불러오기');
    expect(markup).toContain(
      'PubChem 3D를 불러오려면 먼저 이 예제를 불러와 RDKit.js 검증을 완료해 주세요.',
    );
    expect(markup).not.toContain('개발자 로그 / 검증 결과');
    expect(markup).not.toContain('개발자 로그 보기');
    expect(markup).not.toContain('교사용 지도 패널');
    expect(markup).toContain('예제 불러오기');
    expect(markup).toContain('기본 분자');
    expect(markup).toContain('유기 기초');
    expect(markup).toContain('생활 속 분자');
    expect(markup).toContain('물 (Water)');
    expect(markup).toContain('아스피린 (Aspirin)');
    expect(markup).toContain('구조 검증하기');
    expect(markup).toContain('RDKit.js 미검증');
    expect(markup).not.toContain('수업용 활동 모드');
    expect(markup).not.toContain('data-testid="formula-output"');
    expect(markup).not.toContain('data-testid="molecular-weight-output"');
  });
});
