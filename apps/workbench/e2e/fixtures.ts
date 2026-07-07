import type { Page, Route } from '@playwright/test';

export const E2E_CLASS_CODE = 'CHEM-E2E';
export const E2E_JOIN_CODE = 'OPEN2026';
export const E2E_SUBMISSION_ID = 'activity-submission-e2e-001';

export function buildE2eSubmission(overrides: Record<string, unknown> = {}) {
  const now = '2026-07-03T06:22:11.000Z';

  return {
    id: E2E_SUBMISSION_ID,
    submittedAt: now,
    updatedAt: now,
    classCode: E2E_CLASS_CODE,
    studentDisplayName: 'QA 학생',
    anonymousStudentId: 'qa-student-e2e',
    studentUid: 'student-e2e-uid',
    status: 'submitted',
    snapshot: {
      id: 'result-e2e-001',
      createdAt: '2026-07-03T06:20:00.000Z',
      updatedAt: now,
      appMode: 'activity',
      userMode: 'student',
      activityId: 'draw-water',
      activityTitle: '물 분자 구조 그리기',
      moleculeName: '물',
      studentPrediction: {
        predictedFormula: 'H2O',
        predictedMolecularWeight: '18.015',
        drawingReason: '산소와 수소의 결합 수를 기준으로 예상했습니다.',
      },
      rdkitValidation: {
        isValid: true,
        canonicalSmiles: 'O',
        molecularFormula: 'H2O',
        molecularWeight: 18.015,
      },
      threeDObservation: {
        has3DStructure: true,
        sourceLabel: '예제 내장 3D 자료',
        sourceNote: '교육용 정적 3D 좌표입니다.',
        studentObservation: '굽은형으로 보입니다.',
      },
      measurements: [],
      vseprResult: {
        available: true,
        axeNotation: 'AX2E2',
        electronGeometryKo: '정사면체',
        molecularGeometryKo: '굽은형',
        idealBondAngle: '약 104.5°',
        confidence: 'high',
      },
      comparisonObservation: {
        available: true,
        observedSimilarities: '두 구조 모두 굽은형으로 보입니다.',
        observedDifferences: '비공유 전자쌍은 예상 모형에만 표시됩니다.',
        studentReflection: '예상 모형은 실제 좌표를 대신하지 않습니다.',
      },
      activityAnswers: [],
      afterValidationReflection: '구조 확인값을 비교했습니다.',
      finalReflection: '입체 구조와 2D 구조가 다르게 보일 수 있음을 알았습니다.',
      exportNotice: '수업 활동 기록용입니다.',
    },
    ...overrides,
  };
}

export function buildE2eFeedback() {
  return {
    id: 'teacher-feedback-e2e-001',
    createdAt: '2026-07-03T06:30:00.000Z',
    updatedAt: '2026-07-03T06:30:00.000Z',
    source: 'ai_api',
    summary: '물 분자 활동 피드백 초안입니다.',
    strengths: ['구조 확인 결과를 근거로 정리했습니다.'],
    improvementQuestions: ['입체 구조와 2D 구조의 차이를 설명해 보세요.'],
    studentMessage: 'H2O의 분자식과 굽은형 구조를 잘 연결했습니다.',
    teacherReviewNote: '교사가 사실관계와 표현을 확인해야 합니다.',
    reviewRequired: true,
  };
}

async function fulfillJson(route: Route, payload: unknown) {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
}

async function readJsonRequest(route: Route): Promise<Record<string, unknown>> {
  try {
    return JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function mockClassroomApis(page: Page) {
  await page.route('**/api/join-classroom', async (route) => {
    await fulfillJson(route, {
        ok: true,
        status: 'joined',
        classCode: E2E_CLASS_CODE,
        activityTemplateIds: ['draw-water'],
        studentMessage:
          '수업코드 확인이 완료되었습니다. 활동 결과를 서버 제출함에 보낼 수 있습니다.',
        developerMessage: 'E2E joinClassroom mock joined.',
    });
  });

  await page.route('**/api/save-submission', async (route) => {
    const body = await readJsonRequest(route);
    const submission =
      typeof body.submission === 'object' && body.submission !== null
        ? body.submission
        : buildE2eSubmission();

    await fulfillJson(route, {
        ok: true,
        status: 'saved',
        classCode: E2E_CLASS_CODE,
        submission,
        studentMessage: '활동 결과를 서버 제출함에 저장했습니다.',
        developerMessage: 'E2E saveSubmission mock saved.',
    });
  });

  await page.route('**/api/list-student-feedback', async (route) => {
    await fulfillJson(route, {
        ok: true,
        status: 'loaded',
        classCode: E2E_CLASS_CODE,
        submissions: [],
        studentMessage: '교사 피드백을 확인했습니다.',
        developerMessage: 'E2E listStudentFeedback mock loaded.',
    });
  });

  await page.route('**/api/list-submissions', async (route) => {
    await fulfillJson(route, {
        ok: true,
        status: 'loaded',
        classCode: E2E_CLASS_CODE,
        submissions: [buildE2eSubmission()],
        studentMessage: '서버 제출함에서 1개의 제출 자료를 불러왔습니다.',
        developerMessage: 'E2E listSubmissions mock loaded.',
    });
  });

  await page.route('**/api/create-feedback-draft', async (route) => {
    await fulfillJson(route, {
        ok: true,
        status: 'created',
        classCode: E2E_CLASS_CODE,
        feedback: buildE2eFeedback(),
        studentMessage:
          'AI 피드백 초안을 만들었습니다. 교사가 확인한 뒤 학생에게 전달할 수 있습니다.',
        developerMessage: 'E2E createFeedbackDraft mock created.',
    });
  });

  await page.route('**/api/update-feedback', async (route) => {
    const body = await readJsonRequest(route);
    const status =
      body.status === 'feedback_returned' ? 'feedback_returned' : 'feedback_draft';
    const feedback =
      typeof body.feedback === 'object' && body.feedback !== null
        ? body.feedback
        : buildE2eFeedback();

    await fulfillJson(route, {
        ok: true,
        status: 'updated',
        classCode: E2E_CLASS_CODE,
        submission: buildE2eSubmission({
          status,
          teacherFeedback: feedback,
          feedbackReturnedAt:
            status === 'feedback_returned'
              ? '2026-07-03T06:35:00.000Z'
              : undefined,
        }),
        studentMessage:
          status === 'feedback_returned'
            ? '교사 피드백을 학생에게 전달했습니다.'
            : '교사용 피드백 초안을 저장했습니다.',
        developerMessage: `E2E updateFeedback mock updated: ${status}.`,
    });
  });
}
