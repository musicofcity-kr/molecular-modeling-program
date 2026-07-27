import type { ActivitySubmission } from '../../types/feedback';
import { formatKoreanDateTime } from '../../utils/formatKoreanDateTime';

type StudentReturnedFeedbackProps = {
  feedbacks: ActivitySubmission[];
  canRefresh: boolean;
  statusMessage?: string;
  onRefresh: () => void;
};

export function StudentReturnedFeedback({
  feedbacks,
  canRefresh,
  statusMessage,
  onRefresh,
}: StudentReturnedFeedbackProps) {
  return (
    <section
      className="student-returned-feedback"
      data-testid="student-returned-feedback"
      aria-labelledby="student-feedback-title"
    >
      <div className="student-feedback-heading">
        <div>
          <p className="section-label">교사 피드백</p>
          <h3 id="student-feedback-title">제출한 활동의 피드백을 확인합니다</h3>
        </div>
        <button
          className="secondary-action"
          data-testid="refresh-student-feedback-button"
          type="button"
          disabled={!canRefresh}
          onClick={onRefresh}
        >
          교사 피드백 확인하기
        </button>
      </div>

      {feedbacks.length > 0 ? (
        <ul className="student-feedback-list">
          {feedbacks.map((submission) => (
            <li key={submission.id}>
              <strong>
                {submission.snapshot.activityTitle ??
                  submission.snapshot.moleculeName ??
                  '분자 구조 활동'}
              </strong>
              <p>{submission.teacherFeedback?.studentMessage}</p>
              <small>
                {submission.feedbackReturnedAt
                  ? formatKoreanDateTime(submission.feedbackReturnedAt)
                  : '전달 시각 정보 없음'}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="student-feedback-empty">
          아직 전달된 피드백이 없습니다. 제출 후 교사가 확인하면 이곳에
          표시됩니다.
        </p>
      )}

      {statusMessage ? (
        <p className="student-feedback-status" role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
