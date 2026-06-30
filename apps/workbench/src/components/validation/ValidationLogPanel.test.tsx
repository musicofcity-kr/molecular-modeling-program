import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ValidationLogPanel } from './ValidationLogPanel';

const logs = [
  {
    id: '1',
    level: 'info' as const,
    message: 'RDKit.js 검증 완료',
  },
];

describe('ValidationLogPanel', () => {
  it('can be hidden for student mode', () => {
    const markup = renderToStaticMarkup(
      <ValidationLogPanel logs={logs} visible={false} />,
    );

    expect(markup).toBe('');
  });

  it('renders collapsed developer logs for teacher mode', () => {
    const markup = renderToStaticMarkup(
      <ValidationLogPanel
        logs={logs}
        visible
        collapsible
        defaultExpanded={false}
      />,
    );

    expect(markup).toContain('개발자 로그 / 검증 결과');
    expect(markup).toContain('개발자 로그 보기');
    expect(markup).toContain('교사용 검증 로그가 접혀 있습니다.');
    expect(markup).not.toContain('RDKit.js 검증 완료');
  });
});
