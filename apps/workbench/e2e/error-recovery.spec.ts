import { expect, test, type Page } from '@playwright/test';
import {
  E2E_CLASS_CODE,
  E2E_JOIN_CODE,
  mockClassroomApis,
} from './fixtures';

const JOIN_SERVER_FALLBACK_MESSAGE =
  '수업코드 서버 확인을 완료하지 못했습니다. 현재 브라우저에서 활동을 계속할 수 있으며, 서버 제출함은 교사에게 확인해 주세요.';
const LOCAL_SUBMISSION_MESSAGE =
  '현재 활동 결과를 현재 화면의 임시 제출함에 보관했습니다. 새로고침하면 사라집니다.';
const SERVER_SUBMISSION_FAILURE_MESSAGE =
  '서버 제출함 저장 중 문제가 발생했습니다. 현재 활동 결과는 브라우저 제출함에 보관됩니다.';

async function acceptEthicsGate(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('ethics-gate-shell')).toBeVisible();
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').click();
  await expect(page.getByTestId('role-selection-shell')).toBeVisible();
}

async function openStudentEntry(page: Page) {
  await acceptEthicsGate(page);
  await page.getByTestId('open-student-entry-button').click();
  await expect(page.getByTestId('student-entry-shell')).toBeVisible();
}

async function fillStudentEntry(page: Page) {
  await page.getByTestId('student-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('student-join-code-input').fill(E2E_JOIN_CODE);
  await page.getByTestId('student-nickname-input').fill('오류복구-QA');
}

async function enterStudentWorkbench(page: Page) {
  await openStudentEntry(page);
  await fillStudentEntry(page);
  await page.getByTestId('student-entry-submit-button').click();
  await expect(page.getByTestId('app-shell')).toBeVisible();
  await expect(page).toHaveURL(/\/student\/workbench$/);
}

async function loadValidatedExample(
  page: Page,
  exampleId: string,
  expectedFormula: string,
) {
  await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 90_000 },
  );
  await page.getByTestId('student-example-select').selectOption(exampleId);
  await page.getByTestId('student-load-example-button').click();
  await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
    'data-validation-status',
    'valid',
    { timeout: 90_000 },
  );
  await expect(page.getByTestId('student-formula-output')).toContainText(
    expectedFormula,
    { timeout: 90_000 },
  );
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

test.describe('오류 경계와 복구 E2E', () => {
  test('HTTP 200의 unauthorized 응답도 잘못된 입장 확인코드로 차단한다', async ({
    page,
  }) => {
    await page.route('**/api/join-classroom', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          status: 'unauthorized',
          classCode: E2E_CLASS_CODE,
          studentMessage: '입장 확인코드가 올바르지 않습니다.',
          developerMessage: 'E2E rejected invalid join code.',
        }),
      });
    });

    await openStudentEntry(page);
    await fillStudentEntry(page);
    await page.getByTestId('student-entry-submit-button').click();

    await expect(page.getByRole('alert')).toContainText(
      '입장 확인코드가 올바르지 않습니다.',
    );
    await expect(page.getByTestId('student-entry-shell')).toBeVisible();
    await expect(page.getByTestId('app-shell')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/student\/workbench$/);
  });

  test('join 네트워크 실패는 로컬 활동을 허용하되 서버 제출은 잠근다', async ({
    page,
  }) => {
    await page.route('**/api/join-classroom', async (route) => {
      await route.abort('failed');
    });

    await enterStudentWorkbench(page);
    await loadValidatedExample(page, 'water', 'H2O');
    await visitCurrent3DStep(page);
    await page
      .getByTestId('student-thought-input')
      .fill('구조 확인 결과를 바탕으로 물 분자의 모양을 설명했습니다.');

    await expect(page.getByTestId('student-thought-availability')).toContainText(
      JOIN_SERVER_FALLBACK_MESSAGE,
    );
    await expect(page.getByTestId('submit-student-thought-button')).toBeDisabled();
    await expect(page.getByTestId('learning-step-3')).toHaveAttribute(
      'data-status',
      'completed',
    );
  });

  test('join endpoint의 HTML 404는 수업코드 오류로 오인하지 않고 로컬 활동을 허용한다', async ({
    page,
  }) => {
    await page.route('**/api/join-classroom', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'text/html',
        body: '<!doctype html><title>Not Found</title>',
      });
    });

    await enterStudentWorkbench(page);
    await loadValidatedExample(page, 'water', 'H2O');
    await visitCurrent3DStep(page);
    await page
      .getByTestId('student-thought-input')
      .fill('서버 연결이 없어도 3D 비교 결과를 현재 브라우저에서 정리했습니다.');

    await expect(page.getByTestId('student-thought-availability')).toContainText(
      JOIN_SERVER_FALLBACK_MESSAGE,
    );
    await expect(page.getByTestId('submit-student-thought-button')).toBeDisabled();
    await expect(page.getByTestId('student-entry-shell')).toHaveCount(0);
  });

  test('벤젠은 중심 원자 선택 전 확정 VSEPR 예측과 교육용 3D 모형을 차단한다', async ({
    page,
  }) => {
    await mockClassroomApis(page);
    await page.route(
      /pubchem\.ncbi\.nlm\.nih\.gov\/rest\/pug\/compound\/cid\/241\/record\/SDF/,
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: 'text/plain',
          body: 'No 3D conformer',
        });
      },
    );

    await enterStudentWorkbench(page);
    await loadValidatedExample(page, 'benzene', 'C6H6');

    await expect(page.getByTestId('student-molecular-shape-output')).toContainText(
      '중심 원자 후보가 여러 개입니다.',
    );
    await expect(page.getByTestId('vsepr-panel')).toContainText(
      '중심 원자 선택 필요',
    );
    await expect(page.getByTestId('vsepr-center-select')).toBeVisible();
    await expect(page.getByTestId('show-vsepr-model-button')).toBeDisabled();
    await expect(page.getByTestId('vsepr-3d-model-message')).toContainText(
      '먼저 중심 원자를 선택해 주세요.',
    );
    await expect(page.getByTestId('learning-step-4')).toHaveAttribute(
      'data-status',
      'review',
    );
  });

  test('외부 3D 연결이 없는 분자는 2D 분석을 유지하고 자료 없음으로 안내한다', async ({
    page,
  }) => {
    await mockClassroomApis(page);
    await enterStudentWorkbench(page);
    await loadValidatedExample(page, 'acetic-acid', 'C2H4O2');

    await expect(page.getByTestId('viewer-3d-message')).toContainText(
      '이 분자의 3D 자료가 아직 준비되지 않았습니다',
    );
    await expect(page.getByTestId('representation-mode-select')).toBeDisabled();
    await expect(page.getByTestId('load-pubchem-3d-button')).toHaveCount(0);
    await expect(page.getByTestId('student-formula-output')).toContainText(
      'C2H4O2',
    );
  });

  test('구조 분석과 생각 작성 전에는 제출 조건 미충족 상태를 분리해 안내한다', async ({
    page,
  }) => {
    await mockClassroomApis(page);
    await enterStudentWorkbench(page);

    await expect(page.getByTestId('submit-student-thought-button')).toBeDisabled();
    await expect(page.getByTestId('student-thought-availability')).toContainText(
      '구조 확인을 완료하면 제출할 수 있습니다.',
    );

    await loadValidatedExample(page, 'water', 'H2O');

    await expect(page.getByTestId('submit-student-thought-button')).toBeDisabled();
    await expect(page.getByTestId('student-thought-availability')).toContainText(
      '3D 비교 단계에 방문',
    );

    await visitCurrent3DStep(page);

    await expect(page.getByTestId('student-thought-availability')).toContainText(
      '나의 생각을 작성하면 제출할 수 있습니다.',
    );
    await expect(page.getByTestId('learning-step-5')).not.toHaveAttribute(
      'data-status',
      'completed',
    );
  });

  test('제출 요청 중에는 생각 편집과 중복 제출을 잠그고 응답 뒤 다시 해제한다', async ({
    page,
  }) => {
    let saveRequestCount = 0;
    let releaseSaveRequest: (() => void) | undefined;
    const saveRequestGate = new Promise<void>((resolve) => {
      releaseSaveRequest = resolve;
    });

    await mockClassroomApis(page);
    await page.unroute('**/api/save-submission');
    await page.route('**/api/save-submission', async (route) => {
      saveRequestCount += 1;
      const requestBody = JSON.parse(
        route.request().postData() ?? '{}',
      ) as Record<string, unknown>;

      await saveRequestGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          status: 'saved',
          classCode: E2E_CLASS_CODE,
          submission: requestBody.submission,
          studentMessage: '활동 결과를 서버 제출함에 저장했습니다.',
          developerMessage: 'E2E delayed saveSubmission mock saved.',
        }),
      });
    });

    await enterStudentWorkbench(page);
    await loadValidatedExample(page, 'water', 'H2O');
    await visitCurrent3DStep(page);

    const thoughtInput = page.getByTestId('student-thought-input');
    const submitButton = page.getByTestId('submit-student-thought-button');
    await thoughtInput.fill('제출 중에는 이 판단과 근거를 바꾸지 않습니다.');
    await submitButton.click();

    await expect.poll(() => saveRequestCount).toBe(1);
    await expect(thoughtInput).toBeDisabled();
    await expect(submitButton).toBeDisabled();
    await expect(page.getByTestId('student-thought-submission')).toHaveAttribute(
      'aria-busy',
      'true',
    );

    await submitButton.evaluate((element) => {
      element.click();
    });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        }),
    );
    expect(saveRequestCount).toBe(1);

    releaseSaveRequest?.();
    await expect(page.getByTestId('student-thought-submission-status')).toContainText(
      '서버 제출함에 저장했습니다.',
    );
    await expect(thoughtInput).toBeEnabled();
    expect(saveRequestCount).toBe(1);
  });

  test('제출 API 실패는 개인정보를 영속 저장하지 않고 현재 세션 재시도를 유지한다', async ({
    page,
  }) => {
    let saveRequestCount = 0;

    await mockClassroomApis(page);
    await page.unroute('**/api/save-submission');
    await page.route('**/api/save-submission', async (route) => {
      saveRequestCount += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          status: 'server_error',
          classCode: E2E_CLASS_CODE,
          studentMessage: SERVER_SUBMISSION_FAILURE_MESSAGE,
          developerMessage: 'E2E saveSubmission forced server failure.',
        }),
      });
    });

    await enterStudentWorkbench(page);
    await loadValidatedExample(page, 'water', 'H2O');
    await visitCurrent3DStep(page);
    await page
      .getByTestId('student-thought-input')
      .fill('서버 오류가 나도 현재 화면에서 판단과 근거를 다시 제출할 수 있어야 합니다.');
    await page.getByTestId('submit-student-thought-button').click();

    const submissionStatus = page.getByTestId(
      'student-thought-submission-status',
    );
    await expect(submissionStatus).toContainText(LOCAL_SUBMISSION_MESSAGE);
    await expect(submissionStatus).toContainText(
      SERVER_SUBMISSION_FAILURE_MESSAGE,
    );
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'review',
    );
    await expect(page.getByTestId('submit-student-thought-button')).toBeEnabled();
    await expect(page.getByTestId('student-thought-availability')).toContainText(
      '교사에게 제출할 수 있습니다.',
    );

    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem(
            'molecule-workbench-activity-submissions',
          ),
        ),
      )
      .toBeNull();
    await expect(page.getByTestId('student-thought-input')).toHaveValue(
      /현재 화면에서 판단과 근거를 다시 제출/,
    );

    await page.getByTestId('submit-student-thought-button').click();
    await expect.poll(() => saveRequestCount).toBe(2);
    await expect(page.getByTestId('learning-step-5')).toHaveAttribute(
      'data-status',
      'review',
    );
  });
});
