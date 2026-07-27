import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  expect,
  test,
  type Page,
  type TestInfo,
} from '@playwright/test';
import {
  E2E_CLASS_CODE,
  E2E_JOIN_CODE,
  mockClassroomApis,
} from './fixtures';

const screenshotSet = process.env.UX_SCREENSHOT_SET?.trim();
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'notebook-1280x800', width: 1280, height: 800 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
  { name: 'mobile-390x844', width: 390, height: 844 },
  { name: 'landscape-844x390', width: 844, height: 390 },
] as const;

async function openStudentEntry(page: Page) {
  await page.goto('/');
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').click();
  await page.getByTestId('open-student-entry-button').click();
  await expect(page.getByTestId('student-entry-shell')).toBeVisible();
}

async function enterStudentActivity(page: Page) {
  await mockClassroomApis(page);
  await openStudentEntry(page);
  await page.getByTestId('student-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('student-join-code-input').fill(E2E_JOIN_CODE);
  await page.getByTestId('student-nickname-input').fill('QA-테스트학생');
  await page.getByTestId('student-entry-submit-button').click();
  await expect(page.getByTestId('student-activity-shell')).toBeVisible();
  await expect(page).toHaveURL(/\/student\/workbench$/);
  await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 90_000 },
  );
}

async function enterValidatedWaterActivity(page: Page) {
  await enterStudentActivity(page);
  const mobileNavigation = page.getByTestId('student-mobile-step-nav');

  if (await mobileNavigation.isVisible()) {
    await page.getByTestId('mobile-learning-step-2').click();
    await expect(page.getByTestId('drawing-step')).toBeVisible();
  }

  await page.getByTestId('student-example-select').selectOption('water');
  await page.getByTestId('student-load-example-button').click();
  await expect(page.getByTestId('student-formula-output')).toContainText('H2O', {
    timeout: 90_000,
  });
}

async function expectNoHorizontalOverflow(page: Page, viewportName: string) {
  const overflowMetrics = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const viewportWidth = documentElement.clientWidth;
    const pageWidth = Math.max(
      documentElement.scrollWidth,
      body?.scrollWidth ?? 0,
    );

    return {
      viewportWidth,
      pageWidth,
      horizontalOverflow: pageWidth - viewportWidth,
    };
  });

  expect(
    overflowMetrics.horizontalOverflow,
    `${viewportName} horizontal overflow: ${JSON.stringify(overflowMetrics)}`,
  ).toBeLessThanOrEqual(1);
}

async function captureViewportEvidence(
  page: Page,
  viewportName: string,
  testInfo: TestInfo,
) {
  const screenshot = await page.screenshot({ fullPage: true });

  await testInfo.attach(`p0-${viewportName}`, {
    body: screenshot,
    contentType: 'image/png',
  });

  if (!screenshotSet) {
    return;
  }

  const screenshotDirectory = fileURLToPath(
    new URL(
      `../../../docs/qa-screenshots/${screenshotSet}/`,
      import.meta.url,
    ),
  );
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.screenshot({
    path: `${screenshotDirectory}${viewportName}.png`,
    fullPage: true,
  });
}

test.describe('UX redesign evidence', () => {
  for (const viewport of viewports) {
    test(
      `${viewport.name}: validated student activity has screenshot evidence without horizontal overflow`,
      async ({ page }, testInfo) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await enterValidatedWaterActivity(page);

        if (viewport.width <= 768) {
          const mobileNavigation = page.getByTestId('student-mobile-step-nav');
          const mobileTabs = mobileNavigation.getByRole('button');

          await expect(mobileNavigation).toBeVisible();
          await expect(mobileTabs).toHaveCount(5);

          await page.getByTestId('mobile-learning-step-2').click();
          await expect(page.getByTestId('drawing-step')).toBeVisible();
          await page.getByTestId('mobile-learning-step-3').click();
          await expect(page.getByTestId('validation-result-cards')).toBeVisible();
          await page.getByTestId('mobile-learning-step-4').click();
          await expect(page.getByTestId('shape-viewer-section')).toBeVisible();

          if (viewport.name === 'mobile-390x844') {
            for (let step = 1; step <= 5; step += 1) {
              const tab = page.getByTestId(`mobile-learning-step-${step}`);

              await expect(tab).toBeVisible();
              const box = await tab.boundingBox();

              expect(
                box,
                `mobile learning tab ${step} must have a layout box`,
              ).not.toBeNull();
              expect(
                box?.width ?? 0,
                `mobile learning tab ${step} width`,
              ).toBeGreaterThanOrEqual(44);
              expect(
                box?.height ?? 0,
                `mobile learning tab ${step} height`,
              ).toBeGreaterThanOrEqual(44);
            }
          }

          await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
            'data-active-step',
            '4',
          );
          await expect(page.getByTestId('mobile-learning-step-4')).toHaveAttribute(
            'aria-current',
            'step',
          );
        } else {
          await expect(page.getByTestId('drawing-step')).toBeVisible();
          await expect(page.getByTestId('validation-result-cards')).toBeVisible();
          await expect(page.getByTestId('shape-viewer-section')).toBeVisible();
        }

        await expectNoHorizontalOverflow(page, viewport.name);
        await captureViewportEvidence(page, viewport.name, testInfo);
      },
    );
  }

  test('rejects an invalid classroom code and keeps the student outside the activity', async ({
    page,
  }) => {
    await mockClassroomApis(page);
    await page.unroute('**/api/join-classroom');
    await page.route('**/api/join-classroom', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          status: 'classroom_not_found',
          classCode: 'WRONG-CLASS',
          activityTemplateIds: [],
          studentMessage:
            '입력한 수업코드를 찾지 못했습니다. 교사가 안내한 수업코드와 입장 확인코드를 다시 확인해 주세요.',
          developerMessage: 'E2E joinClassroom mock rejected invalid class code.',
        }),
      });
    });

    await openStudentEntry(page);
    await page.getByTestId('student-class-code-input').fill('WRONG-CLASS');
    await page.getByTestId('student-join-code-input').fill(E2E_JOIN_CODE);
    await page.getByTestId('student-nickname-input').fill('QA-입장오류학생');
    await page.getByTestId('student-entry-submit-button').click();

    const entryAlert = page.getByRole('alert');

    await expect(entryAlert).toBeVisible();
    await expect(entryAlert).toContainText('수업코드를 찾지 못했습니다');
    await expect(entryAlert).toContainText('다시 확인해 주세요');
    await expect(page.getByTestId('student-class-code-input')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByTestId('student-class-code-input')).toHaveAttribute(
      'aria-describedby',
      'student-entry-error-message',
    );
    await expect(page.getByTestId('student-entry-shell')).toBeVisible();
    await expect(page.getByTestId('student-activity-shell')).toHaveCount(0);
    await expect(page).not.toHaveURL(/\/student\/workbench$/);
    await expect(page.getByTestId('student-entry-submit-button')).toBeEnabled();
  });

  test('keeps the student entry controls in a predictable keyboard focus order', async ({
    page,
  }) => {
    await mockClassroomApis(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openStudentEntry(page);

    const classCodeInput = page.getByTestId('student-class-code-input');
    const joinCodeInput = page.getByTestId('student-join-code-input');
    const nicknameInput = page.getByTestId('student-nickname-input');
    const submitButton = page.getByTestId('student-entry-submit-button');

    await classCodeInput.focus();
    await expect(classCodeInput).toBeFocused();
    await classCodeInput.fill(E2E_CLASS_CODE);

    await page.keyboard.press('Tab');
    await expect(joinCodeInput).toBeFocused();
    await joinCodeInput.fill(E2E_JOIN_CODE);

    await page.keyboard.press('Tab');
    await expect(nicknameInput).toBeFocused();
    await nicknameInput.fill('QA-키보드학생');

    await page.keyboard.press('Tab');
    await expect(submitButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('student-activity-shell')).toBeVisible();
    await expect(page).toHaveURL(/\/student\/workbench$/);
  });

  test('shows the H2O VSEPR evidence table and gives access to both 3D views', async ({
    page,
  }) => {
    await enterValidatedWaterActivity(page);

    const evidenceTable = page.getByTestId('vsepr-panel');

    await expect(evidenceTable).toBeVisible();
    await expect(evidenceTable.getByText('VSEPR 근거표')).toBeVisible();
    await expect(page.getByTestId('vsepr-central-atom-output')).toHaveText('O1');
    await expect(page.getByTestId('vsepr-bonding-domain-output')).toHaveText('2');
    await expect(page.getByTestId('vsepr-lone-pair-output')).toHaveText('2');
    await expect(page.getByTestId('vsepr-total-domain-output')).toHaveText('4');
    await expect(page.getByTestId('vsepr-electron-geometry-output')).toHaveText(
      '정사면체',
    );
    await expect(page.getByTestId('vsepr-molecular-shape-output')).toHaveText(
      '굽은형',
    );
    await expect(page.getByTestId('vsepr-bond-angle-output')).toContainText(
      '109.5°',
    );

    await expect(page.getByTestId('chemical-editor')).toHaveAttribute(
      'data-editor-mode',
      'simple',
    );
    await page.getByTestId('advanced-editor-mode-button').click();
    await expect(page.getByTestId('chemical-editor')).toHaveAttribute(
      'data-editor-mode',
      'advanced',
    );
    await page.getByTestId('simple-editor-mode-button').click();
    await expect(page.getByTestId('chemical-editor')).toHaveAttribute(
      'data-editor-mode',
      'simple',
    );
    await page.getByTestId('student-confirm-structure-button').click();
    await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
      'data-validation-status',
      'valid',
      { timeout: 90_000 },
    );
    await expect(page.getByTestId('student-formula-output')).toHaveText('H2O');

    await page.getByTestId('learning-step-4').click();
    await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
      'data-active-step',
      '4',
    );
    await expect(page.getByTestId('shape-viewer-section')).toBeVisible();
    await expect(page.getByTestId('vsepr-3d-model-viewer')).toBeVisible();
    await expect(page.getByTestId('molecule-3d-viewer')).toBeVisible();
    await expect(page.getByTestId('vsepr-electron-domain-view-button')).toBeEnabled();
    await expect(page.getByTestId('vsepr-atoms-only-view-button')).toBeEnabled();
    await expect(page.getByTestId('vsepr-lone-pair-toggle')).toBeEnabled();
    await expect(
      page.getByRole('heading', {
        name: '두 모형의 공통점과 차이점은 무엇인가요?',
      }),
    ).toBeVisible();
  });

  test('remounts the Ketcher toolbar without losing water and detects the next user edit', async ({
    page,
  }) => {
    await enterValidatedWaterActivity(page);

    const editor = page.getByTestId('chemical-editor');
    const editorStatus = page.getByTestId('chemical-editor-status');
    const toolbar = editor.getByTestId('top-toolbar').last();
    const layoutButton = editor.getByTestId('Layout button');
    const threeDViewerButton = editor.getByTestId('3D Viewer button');

    await expect(editor).toHaveAttribute('data-editor-mode', 'simple');
    await expect(toolbar).toBeVisible();
    await expect(layoutButton).toHaveCount(0);
    await expect(threeDViewerButton).toHaveCount(0);
    const simpleToolbarButtonCount = await toolbar.locator('button').count();

    await page.getByTestId('advanced-editor-mode-button').click();
    await expect(editor).toHaveAttribute('data-editor-mode', 'advanced');
    await expect(editorStatus).toHaveAttribute('data-ready', 'true', {
      timeout: 90_000,
    });
    await expect(layoutButton).toHaveCount(1);
    await expect(threeDViewerButton).toHaveCount(0);
    const advancedToolbarButtonCount = await toolbar.locator('button').count();

    expect(advancedToolbarButtonCount).toBeGreaterThan(simpleToolbarButtonCount);

    await page.getByTestId('student-confirm-structure-button').click();
    await expect(page.getByTestId('student-formula-output')).toHaveText('H2O', {
      timeout: 90_000,
    });
    await expect(page.getByTestId('student-confirm-structure-button')).toBeEnabled({
      timeout: 90_000,
    });

    await page.getByTestId('simple-editor-mode-button').click();
    await expect(editor).toHaveAttribute('data-editor-mode', 'simple');
    await expect(editorStatus).toHaveAttribute('data-ready', 'true', {
      timeout: 90_000,
    });
    await expect(layoutButton).toHaveCount(0);
    await expect(threeDViewerButton).toHaveCount(0);
    await expect(toolbar.locator('button')).toHaveCount(simpleToolbarButtonCount);

    await page.getByTestId('student-confirm-structure-button').click();
    await expect(page.getByTestId('student-formula-output')).toHaveText('H2O', {
      timeout: 90_000,
    });
    await expect(page.getByTestId('student-confirm-structure-button')).toBeEnabled({
      timeout: 90_000,
    });

    await editor.locator('[data-testid="clear-canvas"]:visible').click();
    await expect(page.getByTestId('student-formula-output')).toHaveText(
      '구조 분석 후 표시',
    );
    await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
      'data-validation-status',
      'not_requested',
    );
  });

  test('compares CH4, NH3, and H2O with four total domains and 0/1/2 lone pairs', async ({
    page,
  }) => {
    await enterStudentActivity(page);

    const comparisonCases = [
      {
        exampleId: 'methane',
        totalDomains: '4',
        lonePairs: '0',
        molecularShape: '정사면체',
      },
      {
        exampleId: 'ammonia',
        totalDomains: '4',
        lonePairs: '1',
        molecularShape: '삼각뿔형',
      },
      {
        exampleId: 'water',
        totalDomains: '4',
        lonePairs: '2',
        molecularShape: '굽은형',
      },
    ] as const;

    for (const comparisonCase of comparisonCases) {
      await test.step(comparisonCase.exampleId, async () => {
        await page
          .getByTestId('student-example-select')
          .selectOption(comparisonCase.exampleId);
        await page.getByTestId('student-load-example-button').click();
        await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
          'data-validation-status',
          'valid',
          { timeout: 90_000 },
        );
        await expect(page.getByTestId('vsepr-total-domain-output')).toHaveText(
          comparisonCase.totalDomains,
        );
        await expect(page.getByTestId('vsepr-lone-pair-output')).toHaveText(
          comparisonCase.lonePairs,
        );
        await expect(page.getByTestId('vsepr-molecular-shape-output')).toHaveText(
          comparisonCase.molecularShape,
        );
      });
    }
  });

  test('turns empty-structure analysis into educational feedback and blocks chemistry results', async ({
    page,
  }) => {
    await enterStudentActivity(page);
    await page.getByTestId('student-confirm-structure-button').click();

    const educationalError = page.getByTestId('structure-analysis-alert');

    await expect(educationalError).toBeVisible();
    await expect(educationalError).toHaveAttribute('role', 'alert');
    await expect(educationalError).toContainText(/구조.*비어|구조를 먼저 그려/);
    await expect(educationalError).toContainText(/원자|결합/);
    await expect(educationalError).toContainText(/다시.*분석|분석.*다시/);
    await expect(page.getByTestId('student-activity-shell')).not.toHaveAttribute(
      'data-validation-status',
      'valid',
    );
    await expect(page.getByTestId('student-formula-output')).toHaveText(
      '구조 분석 후 표시',
    );
    await expect(page.getByTestId('student-central-atom-output')).toHaveText(
      '구조 분석 후 표시',
    );
    await expect(page.getByTestId('student-molecular-shape-output')).toHaveText(
      '구조 분석 후 표시',
    );
    await expect(page.getByTestId('vsepr-central-atom-output')).toHaveText(
      '아직 예측되지 않음',
    );
    await expect(page.getByTestId('vsepr-molecular-shape-output')).toHaveText(
      '아직 예측되지 않음',
    );
    await expect(page.getByTestId('representation-mode-select')).toBeDisabled();
  });
});
