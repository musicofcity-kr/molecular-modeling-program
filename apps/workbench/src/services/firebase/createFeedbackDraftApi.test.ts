import { describe, expect, it, vi } from 'vitest';
import {
  handleCreateFeedbackDraftBody,
  parseCreateFeedbackDraftRequest,
} from '../../../api/create-feedback-draft';
import type { ActivitySubmission, TeacherFeedbackDraft } from '../../types/feedback';

const submission: ActivitySubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: '익명 학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    createdAt: '2026-07-02T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
    appMode: 'activity',
    userMode: 'student',
    activityTitle: '물 분자 구조 그리기',
    moleculeName: '물',
    studentPrediction: {
      predictedFormula: 'H2O',
      predictedMolecularWeight: '18',
      drawingReason: '산소와 수소가 결합한다고 생각했습니다.',
    },
    rdkitValidation: {
      isValid: true,
      molecularFormula: 'H2O',
      molecularWeight: 18.015,
    },
    threeDObservation: {
      has3DStructure: true,
      sourceLabel: '예제 내장 3D 구조',
    },
    measurements: [],
    activityAnswers: [],
    finalReflection: '굽은형 구조를 확인했습니다.',
    exportNotice: '수업 활동 기록용입니다.',
  },
  status: 'submitted',
};

const feedback: TeacherFeedbackDraft = {
  id: 'feedback-1',
  createdAt: '2026-07-02T01:00:00.000Z',
  updatedAt: '2026-07-02T01:00:00.000Z',
  source: 'local_guardrail_preview',
  summary: '물 활동 피드백 초안입니다.',
  strengths: ['구조 확인 결과를 근거로 비교했습니다.'],
  improvementQuestions: ['비공유 전자쌍의 영향을 설명해 보세요.'],
  studentMessage: '교사가 확인할 피드백 초안입니다.',
  teacherReviewNote: '교사 확인 필요',
  reviewRequired: true,
};

describe('create-feedback-draft API helpers', () => {
  it('normalizes and validates a trusted feedback draft request', () => {
    const result = parseCreateFeedbackDraftRequest({
      idToken: 'teacher-token',
      classCode: ' chem/101 ',
      submissionId: 'submission-1',
      snapshot: { unsafe: true },
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
      },
    });
  });

  it('creates a draft only for an assigned teacher using server-loaded submission', async () => {
    const createDraft = vi.fn().mockResolvedValue({
      feedback,
      studentMessage: '서버에서 피드백 초안을 만들었습니다.',
      developerMessage: 'draft created',
    });
    const response = await handleCreateFeedbackDraftBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'teacher-uid',
          teacher: true,
        }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          ownerTeacherUid: 'teacher-uid',
          teacherUids: {
            'teacher-uid': true,
          },
        }),
        getSubmission: vi.fn().mockResolvedValue(submission),
        createDraft,
        now: () => '2026-07-02T01:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'created',
      classCode: 'CHEM-101',
      feedback: {
        id: 'feedback-1',
        studentMessage: '교사가 확인할 피드백 초안입니다.',
      },
    });
    expect(createDraft).toHaveBeenCalledWith(
      submission,
      '2026-07-02T01:00:00.000Z',
    );
  });

  it('rejects a teacher who is not assigned to the classroom', async () => {
    const createDraft = vi.fn();
    const response = await handleCreateFeedbackDraftBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({
          uid: 'other-teacher',
          teacher: true,
        }),
        getClassroom: vi.fn().mockResolvedValue({
          exists: true,
          ownerTeacherUid: 'teacher-uid',
          teacherUids: {
            'teacher-uid': true,
          },
        }),
        getSubmission: vi.fn().mockResolvedValue(submission),
        createDraft,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'unauthorized',
    });
    expect(createDraft).not.toHaveBeenCalled();
  });
});
