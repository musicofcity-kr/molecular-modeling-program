import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { LearningProgressRail } from './LearningProgressRail';

describe('LearningProgressRail', () => {
  it('renders completed, current, and future states without relying only on color', () => {
    const markup = renderToStaticMarkup(
      <LearningProgressRail currentStep={4} onStepSelect={vi.fn()} />,
    );

    expect(markup).toContain('data-step-state="completed"');
    expect(markup).toContain('data-step-state="current"');
    expect(markup).toContain('data-step-state="future"');
    expect(markup).toContain('Li');
    expect(markup).toContain('Cu');
    expect(markup).toContain('Na');
    expect(markup).toContain('K');
    expect(markup).toContain('✓');
    expect(markup).toContain('완료');
    expect(markup).toContain('현재');
    expect(markup).toContain('예정');
  });

  it('marks future step buttons as aria-disabled instead of navigating by anchor', () => {
    const markup = renderToStaticMarkup(
      <LearningProgressRail currentStep={2} onStepSelect={vi.fn()} />,
    );

    expect(markup).toContain('02 예측 입력 단계 현재');
    expect(markup).toContain('03 구조 그리기 단계 예정');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toContain('student-step-3');
    expect(markup).not.toContain('scrollIntoView');
  });

  it('contains the reduced-motion CSS branch for the ignition effect', () => {
    const cssPath = fileURLToPath(
      new URL('../../styles/global.css', import.meta.url),
    );
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('.learning-step.just-ignited');
    expect(css).toContain('animation: none');
  });
});
