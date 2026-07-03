import type { ActivitySubmission, TeacherFeedbackDraft } from '../types/feedback';

export type ExternalFeedbackResponse = {
  summary?: unknown;
  strengths?: unknown;
  improvementQuestions?: unknown;
  studentMessage?: unknown;
  teacherReviewNote?: unknown;
};

export function buildFeedbackRequestPayload(submission: ActivitySubmission) {
  const snapshot = submission.snapshot;

  return {
    guardrails: {
      language: 'ko-KR',
      audience: 'high_school_chemistry_student',
      noAutoGrade: true,
      teacherReviewRequired: true,
      avoidPersonalData: true,
      avoidPersonalityJudgment: true,
      avoidUnverifiedChemistryClaims: true,
      focus:
        '분자 구조 확인 결과, 3D 구조 관찰, VSEPR 예측의 출처와 한계를 구분하도록 돕는 형성 피드백',
    },
    submission: {
      id: submission.id,
      activityTitle: snapshot.activityTitle,
      moleculeName: snapshot.moleculeName,
      prediction: snapshot.studentPrediction,
      validation: snapshot.rdkitValidation,
      threeDObservation: snapshot.threeDObservation,
      vseprResult: snapshot.vseprResult,
      comparisonObservation: snapshot.comparisonObservation,
      answers: snapshot.activityAnswers,
      finalReflection: snapshot.finalReflection,
    },
    requiredResponseShape: {
      summary: 'string',
      strengths: ['string'],
      improvementQuestions: ['string'],
      studentMessage: 'string',
      teacherReviewNote: 'string',
    },
  };
}

export function buildLocalGuardrailFeedback(
  submission: ActivitySubmission,
  now: string,
): TeacherFeedbackDraft {
  const snapshot = submission.snapshot;
  const moleculeName = snapshot.moleculeName ?? '분자';
  const validationText = snapshot.rdkitValidation.isValid
    ? `구조 확인값 ${snapshot.rdkitValidation.molecularFormula ?? '분자식 미표시'}을 기준으로 예측을 비교했습니다.`
    : '아직 구조 확인이 완료되지 않아 분자식과 평균 분자량 판단은 보류해야 합니다.';
  const hasComparison =
    Boolean(snapshot.comparisonObservation?.observedSimilarities?.trim()) ||
    Boolean(snapshot.comparisonObservation?.observedDifferences?.trim());
  const hasPrediction = Boolean(
    snapshot.studentPrediction.predictedFormula?.trim() ||
      snapshot.studentPrediction.drawingReason?.trim(),
  );
  const strengths = [
    hasPrediction
      ? '분자 구조를 그리기 전에 자신의 예측을 먼저 남겼습니다.'
      : '다음 활동에서는 구조를 확인하기 전에 예측을 먼저 적으면 좋습니다.',
    validationText,
    hasComparison
      ? '참고 3D 구조와 입체 구조 예상을 비교하려고 시도했습니다.'
      : '다음 단계에서는 참고 3D 구조와 입체 구조 예상의 차이를 한 문장으로 비교해 보세요.',
  ];
  const improvementQuestions = [
    `${moleculeName}의 분자식 예측과 구조 확인 결과가 다르다면, 어떤 원자나 결합을 다시 확인해야 할까요?`,
    '3D 구조 자료와 입체 구조 예상 모형은 각각 어떤 출처와 한계를 가지고 있나요?',
    '이번 활동에서 처음 생각한 내용과 구조 확인 뒤 바뀐 생각을 한 문장으로 비교해 보세요.',
  ];
  const studentMessage = [
    `${moleculeName} 활동 피드백입니다.`,
    ...strengths.map((item) => `- ${item}`),
    '다음 질문을 바탕으로 한 번 더 정리해 보세요.',
    ...improvementQuestions.map((item) => `- ${item}`),
    '이 피드백은 교사가 확인한 뒤 전달되는 형성 피드백이며 점수나 등급이 아닙니다.',
  ].join('\n');

  return {
    id: createFeedbackId(now),
    createdAt: now,
    updatedAt: now,
    source: 'local_guardrail_preview',
    summary: `${moleculeName} 활동에 대한 교사용 형성 피드백 초안입니다.`,
    strengths,
    improvementQuestions,
    studentMessage,
    teacherReviewNote:
      'AI API가 연결되지 않아 로컬 규칙 기반 초안을 만들었습니다. 학생에게 전달하기 전에 교사가 문구와 과학 내용을 확인해야 합니다.',
    reviewRequired: true,
  };
}

export function parseExternalFeedback(
  data: ExternalFeedbackResponse,
  now: string,
): TeacherFeedbackDraft {
  const summary = sanitizeText(data.summary, 'AI 피드백 초안입니다.');
  const strengths = sanitizeTextArray(data.strengths, [
    '구조 확인 결과를 바탕으로 자신의 생각을 점검했습니다.',
  ]);
  const improvementQuestions = sanitizeTextArray(data.improvementQuestions, [
    '구조 확인 결과와 나의 예측을 비교해 어떤 점을 수정하면 좋을까요?',
  ]);
  const studentMessage =
    sanitizeText(data.studentMessage, '') ||
    [
      summary,
      ...strengths.map((item) => `- ${item}`),
      ...improvementQuestions.map((item) => `- ${item}`),
    ].join('\n');

  return {
    id: createFeedbackId(now),
    createdAt: now,
    updatedAt: now,
    source: 'ai_api',
    summary,
    strengths,
    improvementQuestions,
    studentMessage: sanitizeText(studentMessage, summary),
    teacherReviewNote: sanitizeText(
      data.teacherReviewNote,
      'AI 생성 초안입니다. 교사가 사실관계와 표현을 확인한 뒤 학생에게 전달해야 합니다.',
    ),
    reviewRequired: true,
  };
}

function sanitizeText(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  return value.replace(/\s+/g, ' ').trim().slice(0, 1400) || fallback;
}

function sanitizeTextArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => sanitizeText(item, ''))
    .filter(Boolean)
    .slice(0, 5);

  return cleaned.length > 0 ? cleaned : fallback;
}

function createFeedbackId(now: string): string {
  return `teacher-feedback-${now.replace(/[^0-9]/g, '').slice(0, 14)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
