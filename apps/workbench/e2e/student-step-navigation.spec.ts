import { expect, test, type Page } from '@playwright/test';
import {
  E2E_CLASS_CODE,
  E2E_JOIN_CODE,
  mockClassroomApis,
} from './fixtures';

async function enterStudentWorkbench(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('ethics-gate-shell')).toBeVisible();
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').click();
  await page.getByTestId('open-student-entry-button').click();
  await page.getByTestId('student-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('student-join-code-input').fill(E2E_JOIN_CODE);
  await page.getByTestId('student-nickname-input').fill('단계 이동 학생');
  await page.getByTestId('student-entry-submit-button').click();
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page).toHaveURL(/\/student\/workbench$/);
}

test.describe('student learning step navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockClassroomApis(page);
  });

  test('keeps a manual step after validation refresh and advances only after explicit analysis', async ({
    page,
  }) => {
    await enterStudentWorkbench(page);
    await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 90_000 },
    );

    const activityShell = page.getByTestId('student-activity-shell');
    const loadExampleButton = page.getByTestId('student-load-example-button');
    const analyzeButton = page.getByTestId('student-confirm-structure-button');

    await page.getByTestId('student-example-select').selectOption('water');
    await loadExampleButton.click();
    await expect(activityShell).toHaveAttribute(
      'data-validation-status',
      'valid',
      { timeout: 90_000 },
    );

    await page.getByTestId('learning-step-4').click();
    await expect(activityShell).toHaveAttribute('data-active-step', '4');

    await loadExampleButton.click();
    await expect(loadExampleButton).toBeDisabled();
    await expect(loadExampleButton).toBeEnabled({ timeout: 90_000 });
    await expect(activityShell).toHaveAttribute('data-validation-status', 'valid');
    await expect(activityShell).toHaveAttribute('data-active-step', '4');

    await analyzeButton.click();
    await expect(analyzeButton).toBeDisabled();
    await expect(analyzeButton).toBeEnabled({ timeout: 90_000 });
    await expect(activityShell).toHaveAttribute('data-active-step', '3');
  });
});
