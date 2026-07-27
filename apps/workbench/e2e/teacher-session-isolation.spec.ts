import { expect, test, type Page } from '@playwright/test';
import {
  buildE2eSubmission,
  E2E_CLASS_CODE,
  E2E_SUBMISSION_ID,
  mockClassroomApis,
} from './fixtures';

async function acceptEthicsGate(page: Page) {
  await page.goto('/');
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').click();
  await page.getByTestId('open-teacher-entry-button').click();
}

async function signInTeacher(page: Page) {
  await expect(page.getByTestId('teacher-entry-screen')).toBeVisible();
  await page.getByTestId('teacher-email-input').fill('teacher-e2e@example.com');
  await page.getByTestId('teacher-password-input').fill('teacher-e2e-password');
  await page.getByTestId('teacher-email-login-button').click();
  await expect(page.getByTestId('teacher-dashboard-placeholder')).toBeVisible({
    timeout: 20_000,
  });
}

async function loadTeacherSubmissions(page: Page) {
  await page.getByTestId('teacher-submission-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('load-firestore-submissions-button').click();
}

test('로그아웃 뒤 다시 로그인한 교사 화면에는 이전 서버 제출 목록이 남지 않는다', async ({
  page,
}) => {
  await mockClassroomApis(page);
  await acceptEthicsGate(page);
  await signInTeacher(page);
  await loadTeacherSubmissions(page);

  await expect(
    page.getByTestId(`teacher-server-submission-${E2E_SUBMISSION_ID}`),
  ).toBeVisible();
  await page.getByTestId('teacher-sign-out-button').click();
  await signInTeacher(page);

  await expect(page.getByTestId('teacher-server-submissions')).toHaveCount(0);
  await expect(page.getByTestId(`submission-item-${E2E_SUBMISSION_ID}`)).toHaveCount(
    0,
  );
});

test('이전 교사의 지연된 제출 응답은 로그아웃과 재로그인 뒤 무시한다', async ({
  page,
}) => {
  let releaseResponse!: () => void;
  let markRequestStarted!: () => void;
  let markResponseCompleted!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    releaseResponse = resolve;
  });
  const requestStarted = new Promise<void>((resolve) => {
    markRequestStarted = resolve;
  });
  const responseCompleted = new Promise<void>((resolve) => {
    markResponseCompleted = resolve;
  });

  await mockClassroomApis(page);
  await page.unroute('**/api/list-submissions');
  await page.route('**/api/list-submissions', async (route) => {
    markRequestStarted();
    await responseGate;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        status: 'loaded',
        classCode: E2E_CLASS_CODE,
        submissions: [buildE2eSubmission()],
        studentMessage: '이전 교사의 지연된 제출 응답입니다.',
        developerMessage: 'E2E delayed listSubmissions response.',
      }),
    });
    markResponseCompleted();
  });

  await acceptEthicsGate(page);
  await signInTeacher(page);
  await loadTeacherSubmissions(page);
  await requestStarted;

  await page.getByTestId('teacher-sign-out-button').click();
  await signInTeacher(page);
  releaseResponse();
  await responseCompleted;

  await expect(page.getByTestId('teacher-server-submissions')).toHaveCount(0);
  await expect(
    page.getByTestId(`teacher-server-submission-${E2E_SUBMISSION_ID}`),
  ).toHaveCount(0);
  await expect(page.getByTestId(`submission-item-${E2E_SUBMISSION_ID}`)).toHaveCount(
    0,
  );
});
