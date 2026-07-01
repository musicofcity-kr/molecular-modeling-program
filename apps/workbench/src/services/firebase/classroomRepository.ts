import type { ActivityTemplate } from '../../types/activity';

export type ClassroomDraft = {
  title: string;
  classCode: string;
  activityTemplateIds: string[];
};

export type ActivitySubmissionDraft = {
  classCode: string;
  anonymousStudentId: string;
  activityTemplateId: string;
  activityTitle: string;
  createdAt: string;
};

export type ClassroomRepositoryStatus = 'deferred_until_rules_ready';

export interface ClassroomRepository {
  status: ClassroomRepositoryStatus;
  createClassroomDraft: (draft: ClassroomDraft) => Promise<never>;
  listActivityTemplates: () => Promise<ActivityTemplate[]>;
  saveSubmissionDraft: (draft: ActivitySubmissionDraft) => Promise<never>;
}

export const FIRESTORE_DEFERRED_MESSAGE =
  'Firestore 저장은 Auth와 Security Rules 설계가 끝난 뒤 활성화합니다.';

export function createDeferredClassroomRepository(
  templates: ActivityTemplate[],
): ClassroomRepository {
  return {
    status: 'deferred_until_rules_ready',
    createClassroomDraft: async () => {
      throw new Error(FIRESTORE_DEFERRED_MESSAGE);
    },
    listActivityTemplates: async () => templates,
    saveSubmissionDraft: async () => {
      throw new Error(FIRESTORE_DEFERRED_MESSAGE);
    },
  };
}
