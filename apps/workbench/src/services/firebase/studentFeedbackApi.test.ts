import { describe, expect, it, vi } from 'vitest';
import {
  handleListStudentFeedbackBody,
  parseListStudentFeedbackRequest,
} from '../../../api/list-student-feedback';

const returnedSubmission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T01:00:00.000Z',
  classCode: 'CHEM-101',
  studentDisplayName: '익명 학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    activityTitle: '물 분자 구조 그리기',
  },
  status: 'feedback_returned' as const,
  teacherFeedback: {
    id: 'feedback-1',
    studentMessage: '교사가 확인한 피드백입니다.',
  },
  feedbackReturnedAt: '2026-07-02T01:00:00.000Z',
};

describe('list-student-feedback API helpers', () => {
  it('normalizes and validates a trusted student feedback request', () => {
    const result = parseListStudentFeedbackRequest({
      idToken: 'student-token',
      classCode: ' chem/101 ',
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'student-token',
        classCode: 'CHEM-101',
      },
    });
  });

  it('returns only returned feedbacks for a joined student', async () => {
    const response = await handleListStudentFeedbackBody(
      {
        idToken: 'student-token',
        classCode: 'CHEM-101',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(true),
        listReturnedFeedbacks: vi.fn().mockResolvedValue([returnedSubmission]),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'loaded',
      classCode: 'CHEM-101',
      submissions: [returnedSubmission],
    });
  });

  it('rejects feedback reads before classroom membership is confirmed', async () => {
    const listReturnedFeedbacks = vi.fn();
    const response = await handleListStudentFeedbackBody(
      {
        idToken: 'student-token',
        classCode: 'CHEM-101',
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(false),
        listReturnedFeedbacks,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'membership_required',
    });
    expect(listReturnedFeedbacks).not.toHaveBeenCalled();
  });
});
