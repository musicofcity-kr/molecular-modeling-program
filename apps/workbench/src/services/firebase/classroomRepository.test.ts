import { describe, expect, it } from 'vitest';
import { activityTemplates } from '../../data/activityTemplates';
import {
  FIRESTORE_DEFERRED_MESSAGE,
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
    ).rejects.toThrow(FIRESTORE_DEFERRED_MESSAGE);
    await expect(
      repository.saveSubmissionDraft({
        classCode: 'CHEM-101',
        anonymousStudentId: 'student-test',
        activityTemplateId: 'water-structure',
        activityTitle: '물 분자 구조 그리기',
        createdAt: '2026-07-01T00:00:00.000Z',
      }),
    ).rejects.toThrow(FIRESTORE_DEFERRED_MESSAGE);
  });

  it('can expose local activity templates without server storage', async () => {
    const repository = createDeferredClassroomRepository(activityTemplates);

    await expect(repository.listActivityTemplates()).resolves.toBe(activityTemplates);
  });
});
