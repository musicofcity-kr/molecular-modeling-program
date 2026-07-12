import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { ActivitySubmission } from '../../types/feedback';
import { TeacherFeedbackPanel } from './TeacherFeedbackPanel';

const submission: ActivitySubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-12T00:00:00.000Z',
  updatedAt: '2026-07-12T00:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: '학생 1',
  anonymousStudentId: 'student-1',
  status: 'submitted',
  snapshot: {
    id: 'snapshot-1',
    createdAt: '2026-07-12T00:00:00.000Z',
    updatedAt: '2026-07-12T00:00:00.000Z',
    appMode: 'activity',
    userMode: 'student',
    activityTitle: '물 분자 구조 그리기',
    moleculeName: '물',
    studentPrediction: {},
    rdkitValidation: {
      isValid: true,
      molecularFormula: 'H2O',
      molecularWeight: 18.015,
    },
    threeDObservation: { has3DStructure: true },
    measurements: [],
    vseprResult: {
      available: true,
      studentNote: '굽은형 모양은 산소의 비공유 전자쌍과 관련이 있다.',
    },
    activityAnswers: [],
    finalReflection: '이전 단계형 최종 소감',
    exportNotice: '수업 활동 기록용입니다.',
  },
};

describe('TeacherFeedbackPanel', () => {
  it('shows the thought submitted below the predicted 3D model before legacy reflections', () => {
    const markup = renderToStaticMarkup(
      <TeacherFeedbackPanel
        submissions={[submission]}
        selectedSubmissionId={submission.id}
        draftStatus="idle"
        onSelectSubmission={vi.fn()}
        onCreateFeedbackDraft={vi.fn()}
        onReturnFeedback={vi.fn()}
      />,
    );

    expect(markup).toContain('학생 생각 정리');
    expect(markup).toContain(
      '굽은형 모양은 산소의 비공유 전자쌍과 관련이 있다.',
    );
    expect(markup).not.toContain('이전 단계형 최종 소감');
  });
});
