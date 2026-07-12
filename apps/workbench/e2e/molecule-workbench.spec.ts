import { expect, test, type Page } from '@playwright/test';
import {
  E2E_CLASS_CODE,
  E2E_JOIN_CODE,
  mockClassroomApis,
} from './fixtures';

async function acceptEthicsGate(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('ethics-gate-shell')).toBeVisible();
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').click();
  await expect(page.getByTestId('role-selection-shell')).toBeVisible();
}

async function enterStudentWorkbench(page: Page) {
  await acceptEthicsGate(page);
  await page.getByTestId('open-student-entry-button').click();
  await expect(page.getByTestId('student-entry-shell')).toBeVisible();
  await page.getByTestId('student-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('student-join-code-input').fill(E2E_JOIN_CODE);
  await page.getByTestId('student-nickname-input').fill('3조-학생A');
  await page.getByTestId('student-entry-submit-button').click();
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page).toHaveURL(/\/student\/workbench$/);
}

test.describe('Molecule Modeling Workbench E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockClassroomApis(page);
  });

  test('smoke: app loads through ethics gate and renders role selection', async ({
    page,
  }) => {
    await acceptEthicsGate(page);

    await expect(page.getByTestId('open-student-entry-button')).toBeVisible();
    await expect(page.getByTestId('open-teacher-entry-button')).toBeVisible();
  });

  test('student: validates water, summarizes a thought, and submits it to the teacher', async ({
    page,
  }) => {
    await enterStudentWorkbench(page);

    await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
      'data-validation-status',
      'not_requested',
    );
    await expect(page.getByTestId('activity-template-draw-water')).toBeVisible();
    await expect(page.getByTestId('drawing-step')).toBeVisible();
    await expect(page.getByTestId('validation-result-cards')).toBeVisible();
    await expect(page.getByTestId('shape-viewer-section')).toBeVisible();
    await expect(page.getByTestId('student-wizard-next-button')).toHaveCount(0);
    await expect(page.getByTestId('prediction-step')).toHaveCount(0);
    await expect(page.getByTestId('activity-result-panel')).toHaveCount(0);

    await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 90_000 },
    );
    await page.getByTestId('student-example-select').selectOption('water');
    await page.getByTestId('student-load-example-button').click();
    await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
      'data-validation-status',
      'valid',
      { timeout: 90_000 },
    );
    await expect(page.getByTestId('student-formula-output')).toContainText('H2O', {
      timeout: 90_000,
    });
    await expect(page.getByTestId('student-molecular-weight-output')).toContainText(
      '18.015',
    );

    await expect(page.getByTestId('vsepr-3d-model-viewer')).toBeVisible();
    await expect(page.getByTestId('molecule-3d-viewer')).toBeVisible();
    await page
      .getByTestId('student-thought-input')
      .fill('물 분자는 산소의 비공유 전자쌍 때문에 굽은형으로 보인다.');
    await expect(page.getByTestId('submit-student-thought-button')).toBeEnabled();
    await page.getByTestId('submit-student-thought-button').click();
    await expect(page.getByTestId('student-thought-submission-status')).toContainText(
      '서버 제출함에 저장했습니다.',
    );
  });

  test('teacher: loads mocked submissions, creates AI draft, and returns feedback after review', async ({
    page,
  }) => {
    await acceptEthicsGate(page);
    await page.getByTestId('open-teacher-entry-button').click();
    await expect(page.getByTestId('teacher-entry-screen')).toBeVisible();
    await page.getByTestId('teacher-email-input').fill('teacher-e2e@example.com');
    await page.getByTestId('teacher-password-input').fill('teacher-e2e-password');
    await page.getByTestId('teacher-email-login-button').click();

    await expect(page.getByTestId('teacher-dashboard-placeholder')).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId('teacher-submission-class-code-input').fill(E2E_CLASS_CODE);
    await page.getByTestId('load-firestore-submissions-button').click();
    await expect(page.getByTestId('teacher-server-submissions')).toBeVisible();
    await expect(page.getByTestId('teacher-server-submission-summary')).toContainText(
      '물 분자 구조 그리기',
    );
    await expect(page.getByTestId('teacher-feedback-panel')).toBeVisible();
    await page.getByTestId('create-ai-feedback-draft-button').click();
    await expect(page.getByTestId('teacher-feedback-status')).toContainText(
      '피드백 초안',
      { timeout: 20_000 },
    );

    const feedbackInput = page.getByTestId('teacher-feedback-student-message-input');
    await expect(feedbackInput).toHaveValue(/H2O/);
    await feedbackInput.fill(
      '교사가 확인했습니다. H2O의 굽은형 구조와 비공유 전자쌍 설명을 잘 연결했습니다.',
    );
    await page.getByTestId('return-feedback-button').click();
    await expect(page.getByTestId('teacher-feedback-status')).toContainText(
      '학생에게 전달',
      { timeout: 20_000 },
    );
  });
});
