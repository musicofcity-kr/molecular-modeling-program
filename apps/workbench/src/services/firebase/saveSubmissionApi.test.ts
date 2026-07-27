import { describe, expect, it, vi } from 'vitest';
import {
  buildFirestoreSubmissionDocument,
  getSafeSubmissionWriteDecision,
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
    const writeSubmissionSafely = vi.fn().mockResolvedValue({
      status: 'created',
    });
    const response = await handleSaveSubmissionBody(
      {
        idToken: 'student-token',
        submission,
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(true),
        writeSubmissionSafely,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: 'saved',
      classCode: 'CHEM-111',
    });
    expect(writeSubmissionSafely).toHaveBeenCalledWith(
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
    const writeSubmissionSafely = vi.fn().mockResolvedValue({
      status: 'created',
    });
    const response = await handleSaveSubmissionBody(
      {
        idToken: 'student-token',
        submission,
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(false),
        writeSubmissionSafely,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      ok: false,
      status: 'membership_required',
    });
    expect(writeSubmissionSafely).not.toHaveBeenCalled();
  });

  it('rejects a same-id overwrite when the existing submission belongs to another student', async () => {
    const incomingDocument = buildFirestoreSubmissionDocument({
      submission: {
        ...submission,
        classCode: 'CHEM-111',
      },
      firebaseUid: 'student-b',
    });

    expect(
      getSafeSubmissionWriteDecision(
        {
          ...incomingDocument,
          studentUid: 'student-a',
        },
        incomingDocument,
      ),
    ).toBe('ownership_conflict');

    const writeSubmissionSafely = vi.fn().mockResolvedValue({
      status: 'ownership_conflict',
    });
    const response = await handleSaveSubmissionBody(
      {
        idToken: 'student-b-token',
        submission,
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-b' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(true),
        writeSubmissionSafely,
      },
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({
      ok: false,
      status: 'submission_conflict',
    });
  });

  it('allows an idempotent same-owner update while the submission is still submitted', async () => {
    const incomingDocument = buildFirestoreSubmissionDocument({
      submission: {
        ...submission,
        classCode: 'CHEM-111',
      },
      firebaseUid: 'student-uid',
    });

    expect(
      getSafeSubmissionWriteDecision(incomingDocument, incomingDocument),
    ).toBe('owned_update');

    const writeSubmissionSafely = vi.fn().mockResolvedValue({
      status: 'owned_update',
    });
    const response = await handleSaveSubmissionBody(
      {
        idToken: 'student-token',
        submission,
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(true),
        writeSubmissionSafely,
      },
    );

    expect(response.status).toBe(200);
    expect(writeSubmissionSafely).toHaveBeenCalledOnce();
  });

  it('does not let the owning student erase returned teacher feedback by resubmitting', async () => {
    const incomingDocument = buildFirestoreSubmissionDocument({
      submission: {
        ...submission,
        classCode: 'CHEM-111',
      },
      firebaseUid: 'student-uid',
    });

    expect(
      getSafeSubmissionWriteDecision(
        {
          ...incomingDocument,
          status: 'feedback_returned',
          teacherFeedback: {
            studentMessage: '교사가 반환한 피드백',
          },
        },
        incomingDocument,
      ),
    ).toBe('feedback_locked');

    const writeSubmissionSafely = vi.fn().mockResolvedValue({
      status: 'feedback_locked',
    });
    const response = await handleSaveSubmissionBody(
      {
        idToken: 'student-token',
        submission,
      },
      {
        verifyIdToken: vi.fn().mockResolvedValue({ uid: 'student-uid' }),
        classroomExists: vi.fn().mockResolvedValue(true),
        membershipExists: vi.fn().mockResolvedValue(true),
        writeSubmissionSafely,
      },
    );

    expect(response.status).toBe(409);
    expect(writeSubmissionSafely).toHaveBeenCalledOnce();
  });
});
