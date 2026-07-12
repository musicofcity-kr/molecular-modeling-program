import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StudentThoughtSubmission } from './StudentThoughtSubmission';

describe('StudentThoughtSubmission', () => {
  it('keeps submission disabled until the thought and submission prerequisites are ready', () => {
    const markup = renderToStaticMarkup(
      <StudentThoughtSubmission
        value=""
        canSubmit={false}
        isSubmitting={false}
        availabilityMessage="구조 확인을 완료하면 제출할 수 있습니다."
        statusMessage=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain('나의 생각 정리');
    expect(markup).toContain('data-testid="student-thought-input"');
    expect(markup).toContain('data-testid="submit-student-thought-button"');
    expect(markup).toContain('교사에게 제출하기');
    expect(markup).toContain('구조 확인을 완료하면 제출할 수 있습니다.');
    expect(markup).toContain('disabled=""');
  });

  it('enables submission and exposes the current status when all prerequisites are ready', () => {
    const markup = renderToStaticMarkup(
      <StudentThoughtSubmission
        value="물 분자는 굽은형이고 비공유 전자쌍이 모양에 영향을 준다."
        canSubmit
        isSubmitting={false}
        availabilityMessage="교사에게 제출할 수 있습니다."
        statusMessage="교사에게 제출했습니다."
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(markup).toContain('교사에게 제출했습니다.');
    expect(markup).not.toContain('disabled=""');
  });
});
