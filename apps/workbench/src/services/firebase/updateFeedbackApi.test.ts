import { describe, expect, it, vi } from 'vitest';
import {
  buildFirestoreFeedbackUpdateDocument,
  handleUpdateFeedbackBody,
  parseUpdateFeedbackRequest,
} from '../../../api/update-feedback';

const feedback = {
  id: 'feedback-1',
  createdAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  source: 'local_guardrail_preview' as const,
  summary: '물 분자 활동 피드백 초안입니다.',
  strengths: ['구조 확인 결과를 근거로 비교했습니다.'],
  improvementQuestions: ['굽은형 구조의 이유를 한 문장으로 적어 보세요.'],
  studentMessage: '교사가 확인한 피드백입니다.',
  teacherReviewNote: '교사 검토 완료',
  reviewRequired: true,
};

const submission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: 'QA 학생',
  anonymousStudentId: 'student-1',
  studentUid: 'student-uid',
  snapshot: {
    id: 'result-1',
    activityTitle: '물 분자 구조 그리기',
  },
  status: 'submitted' as const,
};

describe('update-feedback API helpers', () => {
  it('normalizes and validates a trusted feedback update request', () => {
    const result = parseUpdateFeedbackRequest({
      idToken: 'teacher-token',
      classCode: ' chem/101 ',
      submissionId: 'submission-1',
      feedback,
      status: 'feedback_returned',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
        status: 'feedback_returned',
      },
    });
  });

  it('builds a feedback update document without student-owned fields', () => {
    const document = buildFirestoreFeedbackUpdateDocument({
      feedback,
      status: 'feedback_returned',
      now: '2026-07-02T01:00:00.000Z',
    });

    expect(document).toEqual({
      status: 'feedback_returned',
      updatedAt: '2026-07-02T01:00:00.000Z',
      feedbackReturnedAt: '2026-07-02T01:00:00.000Z',
      teacherFeedback: {
        ...feedback,
        updatedAt: '2026-07-02T01:00:00.000Z',
      },
    });
    expect(document).not.toHaveProperty('snapshot');
    expect(document).not.toHaveProperty('studentUid');
  });

  it('updates feedback for an assigned teacher', async () => {
    const updateFeedback = vi.fn().mockResolvedValue({
      ...submission,
      status: 'feedback_returned',
      teacherFeedback: feedback,
      feedbackReturnedAt: '2026-07-02T01:00:00.000Z',
    });
    const response = await handleUpdateFeedbackBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
        feedback,
        status: 'feedback_returned',
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
        updateFeedback,
        now: () => '2026-07-02T01:00:00.000Z',
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'updated',
      classCode: 'CHEM-101',
      submission: {
        id: 'submission-1',
        status: 'feedback_returned',
      },
    });
    expect(updateFeedback).toHaveBeenCalledWith(
      'CHEM-101',
      'submission-1',
      feedback,
      'feedback_returned',
      '2026-07-02T01:00:00.000Z',
    );
  });

  it('rejects a teacher who is not assigned to the classroom', async () => {
    const updateFeedback = vi.fn();
    const response = await handleUpdateFeedbackBody(
      {
        idToken: 'teacher-token',
        classCode: 'CHEM-101',
        submissionId: 'submission-1',
        feedback,
        status: 'feedback_returned',
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
        updateFeedback,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'unauthorized',
    });
    expect(updateFeedback).not.toHaveBeenCalled();
  });
});
