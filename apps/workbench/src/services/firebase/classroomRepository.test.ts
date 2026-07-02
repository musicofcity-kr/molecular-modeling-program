import { describe, expect, it } from 'vitest';
import { activityTemplates } from '../../data/activityTemplates';
import type { ActivityResultSnapshot } from '../../types/activityResult';
import type { ActivitySubmission } from '../../types/feedback';
import {
  FIRESTORE_DEFERRED_MESSAGE,
  buildClassroomDocument,
  buildClassroomPublicInfoDocument,
  buildFirestoreSubmissionDocument,
  buildPublishedActivityTemplateDocument,
  createDeferredClassroomRepository,
} from './classroomRepository';

describe('deferred classroom repository', () => {
  it('keeps Firestore writes disabled until Auth and rules are ready', async () => {
    const repository = createDeferredClassroomRepository(activityTemplates);

    expect(repository.status).toBe('deferred_until_rules_ready');
    await expect(
      repository.createClassroomDraft({
        title: '테스트 수업',
        classCode: 'CHEM-101',
        activityTemplateIds: ['water-structure'],
      }),
    ).resolves.toMatchObject({
      ok: false,
      studentMessage: FIRESTORE_DEFERRED_MESSAGE,
    });
    await expect(
      repository.saveSubmissionDraft({
        classCode: 'CHEM-101',
        anonymousStudentId: 'student-test',
        activityTemplateId: 'water-structure',
        activityTitle: '물 분자 구조 그리기',
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    ).resolves.toMatchObject({
      ok: false,
      studentMessage: FIRESTORE_DEFERRED_MESSAGE,
    });
  });

  it('can expose local activity templates without server storage', async () => {
    const repository = createDeferredClassroomRepository(activityTemplates);

    await expect(repository.listActivityTemplates()).resolves.toBe(activityTemplates);
  });
});

describe('Firestore classroom document builders', () => {
  const now = '2026-07-02T00:00:00.000Z';
  const draft = {
    title: '고1 결합 수업',
    classCode: 'CHEM-101',
    activityTemplateIds: ['draw-water', 'draw-ethanol'],
  };

  it('builds a teacher-owned classroom document that matches security rules', () => {
    const document = buildClassroomDocument({
      draft,
      teacherUid: 'teacher-uid',
      now,
    });

    expect(document.ownerTeacherUid).toBe('teacher-uid');
    expect(document.teacherUids['teacher-uid']).toBe(true);
    expect(document.joinEnabled).toBe(true);
    expect(document.joinCodeHash).toContain('client-join-endpoint-pending');
    expect(Object.keys(document)).toEqual([
      'ownerTeacherUid',
      'teacherUids',
      'title',
      'joinCodeHash',
      'joinEnabled',
      'createdAt',
      'updatedAt',
    ]);
  });

  it('publishes only classroom-safe public info and activity template fields', () => {
    const publicInfo = buildClassroomPublicInfoDocument({
      draft,
      templates: activityTemplates,
      now,
    });
    const templateDocument = buildPublishedActivityTemplateDocument({
      template: activityTemplates[0],
      now,
    });

    expect(publicInfo.title).toBe('고1 결합 수업');
    expect(publicInfo.currentActivityTitle).toBeDefined();
    expect(templateDocument.published).toBe(true);
    expect(templateDocument.activityData).toHaveProperty('id');
    expect(templateDocument.activityData).not.toHaveProperty('teacherNotes');
    expect(templateDocument.activityData).not.toHaveProperty('misconceptionChecks');
  });

  it('strips student submission data down to fields allowed by rules', () => {
    const snapshot = {
      id: 'result-1',
      createdAt: now,
      updatedAt: now,
      appMode: 'activity',
      userMode: 'student',
      activityId: 'draw-water',
      activityTitle: '물 분자 구조 그리기',
      moleculeName: '물',
      studentPrediction: {},
      rdkitValidation: {
        isValid: true,
        molecularFormula: 'H2O',
        molecularWeight: 18.015,
      },
      threeDObservation: {
        has3DStructure: true,
      },
      measurements: [],
      activityAnswers: [],
      exportNotice: '수업 활동 기록용입니다.',
    } satisfies ActivityResultSnapshot;
    const submission = {
      id: 'submission-1',
      submittedAt: now,
      updatedAt: now,
      classCode: 'CHEM-101',
      studentDisplayName: '3조-학생A',
      anonymousStudentId: 'student-123',
      snapshot,
      status: 'submitted',
      teacherFeedback: {
        id: 'unsafe-feedback',
      },
    } as unknown as ActivitySubmission;
    const document = buildFirestoreSubmissionDocument({
      submission,
      firebaseUid: 'student-uid',
    });

    expect(document.classroomId).toBe('CHEM-101');
    expect(document.studentUid).toBe('student-uid');
    expect(document.activityId).toBe('draw-water');
    expect(document.status).toBe('submitted');
    expect(document).not.toHaveProperty('teacherFeedback');
    expect(document).not.toHaveProperty('developerLogs');
    expect(document).not.toHaveProperty('rawMolBlock');
    expect(Object.keys(document)).toEqual([
      'classroomId',
      'studentUid',
      'studentDisplayName',
      'anonymousStudentId',
      'activityId',
      'snapshot',
      'status',
      'submittedAt',
      'updatedAt',
    ]);
  });

  it('normalizes classroom ids before building Firestore path data', () => {
    const snapshot = {
      id: 'result-1',
      createdAt: now,
      updatedAt: now,
      appMode: 'activity',
      userMode: 'student',
      activityId: 'draw-water',
      studentPrediction: {},
      rdkitValidation: { isValid: false },
      threeDObservation: { has3DStructure: false },
      measurements: [],
      activityAnswers: [],
      exportNotice: '수업 활동 기록용입니다.',
    } satisfies ActivityResultSnapshot;
    const submission = {
      id: 'submission-1',
      submittedAt: now,
      updatedAt: now,
      classCode: 'chem/101',
      studentDisplayName: '익명 학생',
      anonymousStudentId: 'student-123',
      snapshot,
      status: 'submitted',
    } satisfies ActivitySubmission;

    expect(
      buildFirestoreSubmissionDocument({
        submission,
        firebaseUid: 'student-uid',
      }).classroomId,
    ).toBe('CHEM-101');
  });
});
