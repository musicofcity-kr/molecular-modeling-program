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

async function goToNextStep(page: Page, step: string) {
  await page.getByTestId('student-wizard-next-button').click();
  await expect(page.getByTestId('student-wizard-stage')).toHaveAttribute(
    'data-current-step',
    step,
  );
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

  test('student: loads water example, validates with RDKit, compares shape, and submits', async ({
    page,
  }) => {
    await enterStudentWorkbench(page);

    await expect(page.getByTestId('student-wizard-stage')).toHaveAttribute(
      'data-current-step',
      '1',
    );
    await expect(page.getByTestId('activity-template-draw-water')).toBeVisible();
    await goToNextStep(page, '2');

    await page.getByTestId('prediction-input-predictedFormula').fill('H2O');
    await page.getByTestId('prediction-input-predictedMolecularWeight').fill('18.015');
    await page
      .getByTestId('prediction-input-drawingReason')
      .fill('산소와 수소의 결합 수를 기준으로 예상했습니다.');
    await page.getByTestId('prediction-input-predictedCentralAtom').fill('O');
    await page.getByTestId('prediction-input-predictedBondingDomains').fill('2');
    await page.getByTestId('prediction-input-predictedLonePairs').fill('2');
    await page.getByTestId('prediction-input-predictedVseprShape').fill('굽은형');
    await goToNextStep(page, '3');

    await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 90_000 },
    );
    await page.getByTestId('student-wizard-next-button').click();
    await expect(page.getByTestId('student-wizard-stage')).toHaveAttribute(
      'data-current-step',
      '3',
    );
    await page.getByTestId('student-example-select').selectOption('water');
    await page.getByTestId('student-load-example-button').click();
    await expect(page.getByTestId('student-wizard-stage')).toHaveAttribute(
      'data-validation-status',
      'valid',
      { timeout: 90_000 },
    );
    await page.getByTestId('student-wizard-next-button').click();
    await expect(page.getByTestId('student-wizard-stage')).toHaveAttribute(
      'data-current-step',
      '4',
      { timeout: 90_000 },
    );
    await expect(page.getByTestId('student-formula-output')).toContainText('H2O', {
      timeout: 90_000,
    });
    await expect(page.getByTestId('student-molecular-weight-output')).toContainText(
      '18.015',
    );

    await goToNextStep(page, '5');
    await expect(page.getByTestId('shape-viewer-section')).toBeVisible();
    await expect(page.getByTestId('vsepr-3d-model-viewer')).toBeVisible();
    await expect(page.getByTestId('molecule-3d-viewer')).toBeVisible();

    await goToNextStep(page, '6');
    await expect(page.getByTestId('toggle-structure-comparison-button')).toBeEnabled();
    await page.getByTestId('toggle-structure-comparison-button').click();
    await page
      .getByTestId('comparison-similarities-input')
      .fill('두 구조 모두 굽은형으로 보입니다.');
    await page
      .getByTestId('comparison-differences-input')
      .fill('예상 모형은 비공유 전자쌍 방향을 강조합니다.');
    await page
      .getByTestId('comparison-reflection-input')
      .fill('예상 모형은 실제 좌표를 대신하지 않습니다.');
    await goToNextStep(page, '7');

    await expect(page.getByTestId('activity-result-panel')).toBeVisible();
    await page.getByTestId('submit-activity-result-button').click();
    await expect(page.getByTestId('activity-submission-status')).toContainText(
      '서버 제출함',
      { timeout: 20_000 },
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
