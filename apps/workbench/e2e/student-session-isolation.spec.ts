import { expect, test, type Page } from '@playwright/test';
import {
  E2E_CLASS_CODE,
  E2E_JOIN_CODE,
  mockClassroomApis,
} from './fixtures';

async function enterStudent(page: Page, nickname: string) {
  await page.getByTestId('student-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('student-join-code-input').fill(E2E_JOIN_CODE);
  await page.getByTestId('student-nickname-input').fill(nickname);
  await page.getByTestId('student-entry-submit-button').click();
  await expect(page.getByTestId('student-activity-shell')).toBeVisible();
}

test('새 학생은 이전 학생의 미제출 답변을 보거나 자기 이름으로 제출할 수 없다', async ({
  page,
}) => {
  const previousStudentDraft =
    '학생A만 작성했고 교사에게 제출하지 않은 비공개 활동 답변';

  await mockClassroomApis(page);
  await page.goto('/');
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').click();
  await page.getByTestId('open-student-entry-button').click();
  await enterStudent(page, '학생A');

  await page.getByTestId('student-thought-input').fill(previousStudentDraft);
  await page.getByTestId('user-mode-teacher').click();
  await expect(page.getByTestId('teacher-entry-screen')).toBeVisible();

  await page.getByTestId('teacher-email-input').fill('teacher-e2e@example.com');
  await page
    .getByTestId('teacher-password-input')
    .fill('teacher-e2e-password');
  await page.getByTestId('teacher-email-login-button').click();
  await expect(page.getByTestId('teacher-dashboard-placeholder')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('activity-panel')).toHaveCount(0);
  await expect(page.getByText(previousStudentDraft, { exact: true })).toHaveCount(
    0,
  );

  await page.getByTestId('teacher-sign-out-button').click();
  await page.getByRole('button', { name: '학생 입장으로 이동' }).click();
  await expect(page.getByTestId('student-entry-shell')).toBeVisible();
  await enterStudent(page, '학생B');

  await expect(page.getByTestId('student-thought-input')).toHaveValue('');
  await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
    'data-status',
    'not-started',
  );
});
