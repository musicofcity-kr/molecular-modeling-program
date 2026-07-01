import type { ActivityResultSnapshot } from './activityResult';

export type ActivitySubmissionStatus =
  | 'submitted'
  | 'feedback_draft'
  | 'feedback_returned';

export type TeacherFeedbackSource = 'ai_api' | 'local_guardrail_preview';

export type AiFeedbackDraftStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'not_configured'
  | 'error';

export interface TeacherFeedbackDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  source: TeacherFeedbackSource;
  summary: string;
  strengths: string[];
  improvementQuestions: string[];
  studentMessage: string;
  teacherReviewNote: string;
  reviewRequired: boolean;
}

export interface ActivitySubmission {
  id: string;
  submittedAt: string;
  updatedAt: string;
  classCode?: string;
  studentDisplayName?: string;
  anonymousStudentId?: string;
  snapshot: ActivityResultSnapshot;
  status: ActivitySubmissionStatus;
  teacherFeedback?: TeacherFeedbackDraft;
  feedbackReturnedAt?: string;
}

export type AiFeedbackDraftResult =
  | {
      ok: true;
      status: 'success';
      feedback: TeacherFeedbackDraft;
      studentMessage: string;
      developerLogs: string[];
    }
  | {
      ok: false;
      status: 'not_configured' | 'error';
      studentMessage: string;
      developerLogs: string[];
    };
