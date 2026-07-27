import { expect, test, type Page } from '@playwright/test';
import {
  buildE2eSubmission,
  E2E_CLASS_CODE,
  E2E_SUBMISSION_ID,
  mockClassroomApis,
} from './fixtures';

async function acceptEthicsGate(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('ethics-gate-shell')).toBeVisible();
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').click();
  await expect(page.getByTestId('role-selection-shell')).toBeVisible();
}

async function enterTeacherDashboard(page: Page) {
  await acceptEthicsGate(page);
  await page.getByTestId('open-teacher-entry-button').click();
  await expect(page.getByTestId('teacher-entry-screen')).toBeVisible();
  await page.getByTestId('teacher-email-input').fill('teacher-e2e@example.com');
  await page.getByTestId('teacher-password-input').fill('teacher-e2e-password');
  await page.getByTestId('teacher-email-login-button').click();
  await expect(page.getByTestId('teacher-dashboard-placeholder')).toBeVisible({
    timeout: 20_000,
  });
}

test('원격 피드백 전달이 모두 실패하면 초안 상태를 유지하고 재시도를 안내한다', async ({
  page,
}) => {
  let releaseReturnFailure!: () => void;
  const returnFailureGate = new Promise<void>((resolve) => {
    releaseReturnFailure = resolve;
  });
  let returnRequestCount = 0;

  await mockClassroomApis(page);
  await page.unroute('**/api/update-feedback');
  await page.route('**/api/update-feedback', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}') as {
      status?: string;
      feedback?: Record<string, unknown>;
    };

    if (body.status === 'feedback_returned') {
      returnRequestCount += 1;
      await returnFailureGate;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          status: 'server_error',
          classCode: E2E_CLASS_CODE,
          studentMessage: '서버 제출함에 피드백을 저장하지 못했습니다.',
          developerMessage: 'E2E forced feedback return failure.',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        status: 'updated',
        classCode: E2E_CLASS_CODE,
        submission: buildE2eSubmission({
          status: 'feedback_draft',
          teacherFeedback: body.feedback,
        }),
        studentMessage: '서버 제출함에도 피드백 초안을 저장했습니다.',
        developerMessage: 'E2E feedback draft saved.',
      }),
    });
  });

  await enterTeacherDashboard(page);
  await page.getByTestId('teacher-submission-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('load-firestore-submissions-button').click();
  await expect(page.getByTestId('teacher-feedback-panel')).toBeVisible();

  await page.getByTestId('create-ai-feedback-draft-button').click();
  const submissionItem = page.getByTestId(
    `submission-item-${E2E_SUBMISSION_ID}`,
  );
  await expect(submissionItem).toContainText('피드백 초안 작성됨', {
    timeout: 20_000,
  });

  const feedbackInput = page.getByTestId(
    'teacher-feedback-student-message-input',
  );
  await feedbackInput.fill(
    '교사가 확인한 피드백입니다. 실패하면 초안 상태에서 다시 시도해야 합니다.',
  );
  await page.getByTestId('return-feedback-button').click();

  await expect(page.getByTestId('teacher-feedback-status')).toContainText(
    '학생에게 전달하는 중입니다.',
  );
  await expect(submissionItem).toContainText('피드백 초안 작성됨');
  await expect.poll(() => returnRequestCount).toBe(1);

  await page.getByTestId('return-feedback-button').click();
  await expect(page.getByTestId('teacher-feedback-status')).toContainText(
    '이미 피드백 전달 요청을 처리 중입니다.',
  );
  expect(returnRequestCount).toBe(1);

  releaseReturnFailure();

  const feedbackStatus = page.getByTestId('teacher-feedback-status');
  await expect(feedbackStatus).toContainText('피드백을 전달하지 못했습니다.');
  await expect(feedbackStatus).toContainText('기존 피드백 초안 상태를 유지했습니다.');
  await expect(feedbackStatus).toContainText(
    'Firebase 설정이 없어 서버 제출함을 사용할 수 없습니다.',
  );
  await expect(feedbackStatus).toContainText('다시 시도해 주세요.');
  await expect(submissionItem).toContainText('피드백 초안 작성됨');
  await expect(submissionItem).not.toContainText('피드백 전달 완료');

  const sharedLocalSubmissionStatus = await page.evaluate((submissionId) => {
    const rawValue = window.localStorage.getItem(
      'molecule-workbench-activity-submissions',
    );
    const submissions = rawValue
      ? (JSON.parse(rawValue) as Array<{ id?: string; status?: string }>)
      : [];

    return submissions.find((item) => item.id === submissionId)?.status ?? null;
  }, E2E_SUBMISSION_ID);
  expect(sharedLocalSubmissionStatus).toBeNull();

  await expect(page.getByTestId('return-feedback-button')).toBeEnabled();
  await page.getByTestId('return-feedback-button').click();
  await expect.poll(() => returnRequestCount).toBe(2);
});
