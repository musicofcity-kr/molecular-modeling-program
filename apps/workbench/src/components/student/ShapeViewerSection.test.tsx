import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ShapeViewerSection } from './ShapeViewerSection';

describe('ShapeViewerSection', () => {
  it('explains the mobile VSEPR/reference 3D tab switch without merging the model boundaries', () => {
    const markup = renderToStaticMarkup(
      <ShapeViewerSection
        predictionSlot={<section>VSEPR 예상 모형</section>}
        actual3DSlot={<section>좌표 기반 참고 3D 구조</section>}
        comparisonSlot={<section>구조 비교</section>}
      />,
    );

    const guide =
      '작은 화면에서는 아래 탭을 눌러 VSEPR 예상 모형과 참고 3D 구조를 번갈아 확인하세요.';

    expect(markup).toContain('mobile-viewer-guide');
    expect(markup).toContain(guide);
    expect(markup.indexOf(guide)).toBeLessThan(
      markup.indexOf('aria-label="모바일 3D 비교 화면 선택"'),
    );
    expect(markup).toContain('VSEPR 예상 모형');
    expect(markup).toContain('좌표 기반 참고 3D 구조');
  });
});
