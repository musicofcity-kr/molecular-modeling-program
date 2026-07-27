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

async function visitCurrent3DStep(page: Page) {
  await expect(page.getByTestId('learning-step-4')).toHaveAttribute(
    'data-status',
    'review',
  );
  await page.getByTestId('learning-step-4').click();
  await expect(page.getByTestId('learning-step-4')).toHaveAttribute(
    'data-status',
    'completed',
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
    await visitCurrent3DStep(page);
    await page
      .getByTestId('student-thought-input')
      .fill('물 분자는 산소의 비공유 전자쌍 때문에 굽은형으로 보인다.');
    await expect(page.getByTestId('submit-student-thought-button')).toBeEnabled();
    await page.getByTestId('submit-student-thought-button').click();
    await expect(page.getByTestId('student-thought-submission-status')).toContainText(
      '서버 제출함에 저장했습니다.',
    );
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'completed',
    );

    await page
      .getByTestId('student-thought-input')
      .fill('내용을 고치면 현재 제출 완료 표시는 다시 검토 필요 상태가 된다.');
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'review',
    );
  });

  test('student: invalidates validated results when the Ketcher canvas is edited', async ({
    page,
  }) => {
    await enterStudentWorkbench(page);

    const activityShell = page.getByTestId('student-activity-shell');
    const editor = page.getByTestId('chemical-editor');
    const thought = '물 분자는 두 비공유 전자쌍 때문에 굽은형으로 보인다.';

    await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 90_000 },
    );
    await page.getByTestId('student-example-select').selectOption('water');
    await page.getByTestId('student-load-example-button').click();
    await expect(activityShell).toHaveAttribute('data-validation-status', 'valid', {
      timeout: 90_000,
    });
    await expect(page.getByTestId('student-formula-output')).toHaveText('H2O');
    await expect(page.getByTestId('vsepr-3d-model-message')).toContainText('AX2E2');
    await expect(page.getByTestId('viewer-3d-message')).toContainText(
      '물의 교육용 3D 자료',
    );

    await visitCurrent3DStep(page);
    await page.getByTestId('student-thought-input').fill(thought);
    await page.getByTestId('submit-student-thought-button').click();
    await expect(page.getByTestId('student-thought-submission-status')).toContainText(
      '서버 제출함에 저장했습니다.',
    );
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'completed',
    );

    await editor.locator('[data-testid="clear-canvas"]:visible').click();

    await expect(activityShell).toHaveAttribute(
      'data-validation-status',
      'not_requested',
    );
    await expect(page.getByTestId('student-formula-output')).toHaveText(
      '구조 분석 후 표시',
    );
    await expect(page.getByTestId('vsepr-3d-model-message')).toContainText(
      '지원되는 구조에서만',
    );
    await expect(page.getByTestId('viewer-3d-message')).toContainText(
      '3D 자료가 아직 준비되지 않았습니다',
    );
    await expect(page.getByTestId('submit-student-thought-button')).toBeDisabled();
    await expect(page.getByTestId('student-thought-submission-status')).toHaveCount(0);
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'review',
    );

    await page.getByTestId('student-load-example-button').click();
    await expect(activityShell).toHaveAttribute('data-validation-status', 'valid', {
      timeout: 90_000,
    });
    await expect(page.getByTestId('student-formula-output')).toHaveText('H2O');
    await expect(page.getByTestId('vsepr-3d-model-message')).toContainText('AX2E2');
    await expect(page.getByTestId('viewer-3d-message')).toContainText(
      '물의 교육용 3D 자료',
    );
    await expect(page.getByTestId('submit-student-thought-button')).toBeDisabled();
    await expect(page.getByTestId('student-thought-availability')).toContainText(
      '3D 비교 단계에 방문',
    );
    await visitCurrent3DStep(page);
    await expect(page.getByTestId('submit-student-thought-button')).toBeEnabled();

    await page.getByTestId('advanced-editor-mode-button').click();
    await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 90_000 },
    );
    await expect(activityShell).toHaveAttribute('data-validation-status', 'valid');
    await expect(page.getByTestId('student-formula-output')).toHaveText('H2O');
  });

  test('student: clears derived chemistry state when leaving and returning to the editor route', async ({
    page,
  }) => {
    await enterStudentWorkbench(page);

    const activityShell = page.getByTestId('student-activity-shell');
    await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
      'data-ready',
      'true',
      { timeout: 90_000 },
    );
    await page.getByTestId('student-example-select').selectOption('water');
    await page.getByTestId('student-load-example-button').click();
    await expect(activityShell).toHaveAttribute('data-validation-status', 'valid', {
      timeout: 90_000,
    });
    await expect(page.getByTestId('student-formula-output')).toHaveText('H2O');
    await expect(page.getByTestId('molecule-3d-viewer')).toBeVisible();

    await visitCurrent3DStep(page);
    await page
      .getByTestId('student-thought-input')
      .fill('경로를 바꾸기 전에 저장된 물 분자 관찰 기록');
    await page.getByTestId('submit-student-thought-button').click();
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'completed',
    );

    await page.getByTestId('user-mode-teacher').click();
    await expect(page.getByTestId('teacher-entry-screen')).toBeVisible();
    await page.getByRole('button', { name: '학생 입장으로 이동' }).click();

    await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
      'data-validation-status',
      'not_requested',
    );
    await expect(page.getByTestId('student-formula-output')).toHaveText(
      '구조 분석 후 표시',
    );
    await expect(page.getByTestId('viewer-3d-message')).toContainText(
      '3D 자료가 아직 준비되지 않았습니다',
    );
    await expect(page.getByTestId('student-thought-submission-status')).toHaveCount(0);
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'review',
    );
  });

  test('teacher: loads mocked submissions, creates AI draft, and returns feedback after review', async ({
    page,
  }) => {
    await page.route('**/api/create-classroom', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          status: 'created',
          classCode: E2E_CLASS_CODE,
          studentMessage: '수업방을 서버에 만들었습니다.',
          developerMessage: 'E2E createClassroom mock created.',
        }),
      });
    });
    await acceptEthicsGate(page);
    await page.getByTestId('open-teacher-entry-button').click();
    await expect(page.getByTestId('teacher-entry-screen')).toBeVisible();
    await page.getByTestId('teacher-email-input').fill('teacher-e2e@example.com');
    await page.getByTestId('teacher-password-input').fill('teacher-e2e-password');
    await page.getByTestId('teacher-email-login-button').click();

    await expect(page.getByTestId('teacher-dashboard-placeholder')).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId('teacher-classroom-title-input').fill(
      'QA 분자구조 탐구',
    );
    await page.getByTestId('teacher-classroom-code-input').fill(E2E_CLASS_CODE);
    await page.getByTestId('teacher-classroom-join-code-input').fill(E2E_JOIN_CODE);
    await page.getByTestId('create-firestore-classroom-button').click();
    await expect(page.getByTestId('teacher-classroom-status')).toContainText(
      '수업방을 서버에 만들었습니다.',
    );

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
