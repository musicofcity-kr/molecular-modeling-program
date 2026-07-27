import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  E2E_CLASS_CODE,
  E2E_JOIN_CODE,
  mockClassroomApis,
} from './fixtures';

const screenshotSet = process.env.UX_SCREENSHOT_SET?.trim();

async function captureMobileCompletionEvidence(page: Page) {
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
    path: `${screenshotDirectory}mobile-390x844-touch-completed.png`,
    fullPage: true,
  });
}

async function enterValidatedWaterActivity(page: Page) {
  await mockClassroomApis(page);
  await page.goto('/');
  await page.getByTestId('ethics-guide-confirm-checkbox').check();
  await page.getByTestId('ethics-guide-start-button').tap();
  await page.getByTestId('open-student-entry-button').tap();
  await page.getByTestId('student-class-code-input').fill(E2E_CLASS_CODE);
  await page.getByTestId('student-join-code-input').fill(E2E_JOIN_CODE);
  await page.getByTestId('student-nickname-input').fill('모바일-touch-QA');
  await page.getByTestId('student-entry-submit-button').tap();

  await page.getByTestId('mobile-learning-step-2').tap();
  await expect(page.getByTestId('chemical-editor-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 90_000 },
  );
  await page.getByTestId('student-example-select').selectOption('water');
  await page.getByTestId('student-load-example-button').tap();
  await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
    'data-validation-status',
    'valid',
    { timeout: 90_000 },
  );
  await expect(page.getByTestId('student-formula-output')).toHaveText('H2O');
}

async function dispatchTouchDrag(page: Page, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await target.evaluate((element) => {
    element.setAttribute('data-touch-start-count', '0');
    element.setAttribute('data-touch-move-count', '0');
    element.setAttribute('data-touch-end-count', '0');

    const increment = (attributeName: string) => {
      const currentValue = Number(element.getAttribute(attributeName) ?? '0');
      element.setAttribute(attributeName, String(currentValue + 1));
    };

    element.addEventListener(
      'touchstart',
      () => increment('data-touch-start-count'),
      { capture: true },
    );
    element.addEventListener(
      'touchmove',
      () => increment('data-touch-move-count'),
      { capture: true },
    );
    element.addEventListener(
      'touchend',
      () => increment('data-touch-end-count'),
      { capture: true },
    );
  });

  const box = await target.boundingBox();
  expect(box, 'the mobile 3D viewer must expose a touch surface').not.toBeNull();
  if (!box) {
    return;
  }

  const session = await page.context().newCDPSession(page);
  const startX = box.x + box.width * 0.35;
  const startY = box.y + box.height * 0.55;
  const endX = box.x + box.width * 0.68;
  const endY = box.y + box.height * 0.42;
  const makePoint = (x: number, y: number) => ({
    x,
    y,
    id: 1,
    radiusX: 2,
    radiusY: 2,
    force: 1,
  });

  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [makePoint(startX, startY)],
    });

    for (let step = 1; step <= 4; step += 1) {
      const progress = step / 4;
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          makePoint(
            startX + (endX - startX) * progress,
            startY + (endY - startY) * progress,
          ),
        ],
      });
    }

    await session.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }

  await expect(target).toHaveAttribute('data-touch-start-count', '1');
  await expect(target).toHaveAttribute('data-touch-end-count', '1');
  await expect
    .poll(async () =>
      Number(await target.getAttribute('data-touch-move-count')),
    )
    .toBeGreaterThan(0);
}

async function expectSingleSized3DCanvas(host: Locator) {
  const canvas = host.locator('canvas');

  await expect(canvas).toHaveCount(1);
  await expect
    .poll(async () => {
      if ((await canvas.count()) !== 1) {
        return false;
      }

      const [box, dimensions] = await Promise.all([
        canvas.boundingBox(),
        canvas.evaluate((element) => {
          const renderedCanvas = element as HTMLCanvasElement;
          return {
            width: renderedCanvas.width,
            height: renderedCanvas.height,
          };
        }),
      ]);

      return Boolean(
        box &&
          box.width > 0 &&
          box.height > 0 &&
          dimensions.width > 0 &&
          dimensions.height > 0,
      );
    })
    .toBe(true);
}

test('390x844 touch device completes 3D visit and submission without fixed-nav overlap', async ({
  page,
}) => {
  const deviceSignals = await page.evaluate(() => ({
    maxTouchPoints: navigator.maxTouchPoints,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    userAgent: navigator.userAgent,
  }));

  expect(deviceSignals.maxTouchPoints).toBeGreaterThan(0);
  expect(deviceSignals.coarsePointer).toBe(true);
  expect(deviceSignals.userAgent).toContain('Android');

  await enterValidatedWaterActivity(page);

  await page.getByTestId('mobile-learning-step-3').tap();
  const showVseprModelButton = page.getByTestId('show-vsepr-model-button');
  await expect(showVseprModelButton).toHaveText(
    '3D 비교에서 VSEPR 모형 보기',
  );
  await showVseprModelButton.tap();

  const step4Button = page.getByTestId('mobile-learning-step-4');
  await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
    'data-active-step',
    '4',
  );
  await expect(step4Button).toHaveAttribute('aria-current', 'step');
  await expect(step4Button).toHaveAttribute('data-status', 'completed');

  const vseprModelViewer = page.getByTestId('vsepr-3d-model-viewer');
  await expect(vseprModelViewer).toHaveAttribute('data-viewer-status', 'ready');
  await expect(vseprModelViewer).toHaveAttribute('data-model-rendered', 'true');
  await expect(page.getByTestId('mobile-vsepr-view-button')).toHaveAttribute(
    'aria-selected',
    'true',
  );

  const vsepr3DHost = page.getByTestId('vsepr-3d-host');
  await expect(vsepr3DHost).toBeVisible();
  await expectSingleSized3DCanvas(vsepr3DHost);
  await dispatchTouchDrag(page, vsepr3DHost);

  const reference3DViewButton = page.getByTestId(
    'mobile-reference-3d-view-button',
  );
  await reference3DViewButton.tap();
  await expect(reference3DViewButton).toHaveAttribute('aria-selected', 'true');

  const molecule3DViewer = page.getByTestId('molecule-3d-viewer');
  await expect(molecule3DViewer).toHaveAttribute('data-viewer-status', 'ready');
  await expect(molecule3DViewer).toHaveAttribute('data-model-rendered', 'true');

  const molecule3DHost = page.getByTestId('viewer-3d');
  await expect(molecule3DHost).toBeVisible();
  await expect
    .poll(async () => {
      const box = await molecule3DHost.boundingBox();
      return Boolean(box && box.width > 0 && box.height > 0);
    })
    .toBe(true);
  await expectSingleSized3DCanvas(molecule3DHost);

  await page.getByTestId('mobile-learning-step-5').tap();
  const thoughtInput = page.getByTestId('student-thought-input');
  const submitButton = page.getByTestId('submit-student-thought-button');
  const mobileNavigation = page.getByTestId('student-mobile-step-nav');

  await thoughtInput.tap();
  await thoughtInput.fill(
    '물 분자는 산소 주위의 두 비공유 전자쌍 때문에 굽은형으로 보인다.',
  );
  await expect(submitButton).toBeEnabled();
  await submitButton.tap({ trial: true });

  const [buttonBox, navigationBox] = await Promise.all([
    submitButton.boundingBox(),
    mobileNavigation.boundingBox(),
  ]);
  expect(buttonBox, 'the mobile submit action must have a layout box').not.toBeNull();
  expect(
    navigationBox,
    'the fixed mobile learning navigation must have a layout box',
  ).not.toBeNull();
  if (buttonBox && navigationBox) {
    expect(buttonBox.width).toBeGreaterThanOrEqual(44);
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(navigationBox.y);
  }

  await submitButton.tap();
  await expect(page.getByTestId('student-thought-submission-status')).toContainText(
    '서버 제출함에 저장했습니다.',
  );
  await expect(page.getByTestId('mobile-learning-step-5')).toHaveAttribute(
    'data-status',
    'completed',
  );
  await captureMobileCompletionEvidence(page);

  await page.getByTestId('mobile-learning-step-2').tap();
  await page
    .locator(
      '[data-testid="chemical-editor"] [data-testid="clear-canvas"]:visible',
    )
    .tap();
  await expect(page.getByTestId('student-activity-shell')).toHaveAttribute(
    'data-validation-status',
    'not_requested',
  );

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});
