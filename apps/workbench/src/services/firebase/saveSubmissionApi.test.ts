import { describe, expect, it, vi } from 'vitest';
import {
  buildFirestoreSubmissionDocument,
  handleSaveSubmissionBody,
  parseSaveSubmissionRequest,
} from '../../../api/save-submission';

const submission = {
  id: 'submission-1',
  submittedAt: '2026-07-02T00:00:00.000Z',
  updatedAt: '2026-07-02T00:00:00.000Z',
  classCode: 'chem/111',
  studentDisplayName: 'QA 학생',
  anonymousStudentId: 'student-1',
  snapshot: {
    id: 'result-1',
    activityId: 'draw-carbon-dioxide',
    activityTitle: '이산화탄소 분자 구조 그리기',
  },
  status: 'submitted' as const,
};

describe('save-submission API helpers', () => {
  it('normalizes and validates a trusted student submission request', () => {
    const result = parseSaveSubmissionRequest({
      idToken: 'student-token',
      submission,
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        idToken: 'student-token',
        submission: {
          ...submission,
          classCode: 'CHEM-111',
        },
      },
    });
  });

  it('strips the Firestore document down to classroom-safe submitted fields', () => {
    const document = buildFirestoreSubmissionDocument({
      submission: {
        ...submission,
        classCode: 'CHEM-111',
      },
      firebaseUid: 'student-uid',
    });

    expect(document).toEqual({
      classroomId: 'CHEM-111',
      studentUid: 'student-uid',
      studentDisplayName: 'QA 학생',
      anonymousStudentId: 'student-1',
      activityId: 'draw-carbon-dioxide',
      snapshot: submission.snapshot,
      status: 'submitted',
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
    });
  });

  it('rejects unsafe submission payloads before writing', () => {
    const result = parseSaveSubmissionRequest({
      idToken: 'student-token',
      submission: {
        ...submission,
        teacherFeedback: {
          summary: 'unsafe',
        },
      },
    });

    expect(result.ok).toBe(false);
  });

  it('writes a submission for a classroom member student', async () => {
    const writeSubmission = vi.fn().mockResolvedValue(undefined);
    const response = await handleSaveSubmissionBody(
      {
        idToken: 'student-token',
        submission,
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(true),
        writeSubmission,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'saved',
      classCode: 'CHEM-111',
    });
    expect(writeSubmission).toHaveBeenCalledWith(
      'CHEM-111',
      'submission-1',
      expect.objectContaining({
        classroomId: 'CHEM-111',
        studentUid: 'student-uid',
        activityId: 'draw-carbon-dioxide',
      }),
    );
  });

  it('does not write when the student membership is missing', async () => {
    const writeSubmission = vi.fn().mockResolvedValue(undefined);
    const response = await handleSaveSubmissionBody(
      {
        idToken: 'student-token',
        submission,
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(false),
        writeSubmission,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'membership_required',
    });
    expect(writeSubmission).not.toHaveBeenCalled();
  });
});
