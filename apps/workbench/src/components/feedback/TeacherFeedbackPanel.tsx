import { useEffect, useState } from 'react';
import type {
  ActivitySubmission,
  AiFeedbackDraftStatus,
} from '../../types/feedback';
import { formatKoreanDateTime } from '../../utils/formatKoreanDateTime';

type TeacherFeedbackPanelProps = {
  submissions: ActivitySubmission[];
  selectedSubmissionId?: string | null;
  draftStatus: AiFeedbackDraftStatus;
  statusMessage?: string;
  onSelectSubmission: (submissionId: string) => void;
  onCreateFeedbackDraft: (submissionId: string) => void;
  onReturnFeedback: (submissionId: string, studentMessage: string) => void;
};

export function TeacherFeedbackPanel({
  submissions,
  selectedSubmissionId,
  draftStatus,
  statusMessage,
  onSelectSubmission,
  onCreateFeedbackDraft,
  onReturnFeedback,
}: TeacherFeedbackPanelProps) {
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ??
    submissions[0] ??
    null;
  const [editedStudentMessage, setEditedStudentMessage] = useState('');

  useEffect(() => {
    setEditedStudentMessage(selectedSubmission?.teacherFeedback?.studentMessage ?? '');
  }, [selectedSubmission?.id, selectedSubmission?.teacherFeedback?.studentMessage]);

  if (submissions.length === 0) {
    return (
      <section className="workspace-panel teacher-feedback-panel">
        <div className="panel-heading teacher-heading">
          <div>
            <p className="section-label">교사용 피드백</p>
            <h2>학생 제출 자료와 AI 피드백</h2>
          </div>
          <span className="status-pill">교사 확인 후 전달</span>
        </div>
        <p className="teacher-boundary-note">
          아직 제출된 활동 결과가 없습니다. 학생이 활동 결과 정리에서
          교사에게 제출하면 이곳에 표시됩니다.
        </p>
      </section>
    );
  }

  return (
    <section
      className="workspace-panel teacher-feedback-panel"
      data-testid="teacher-feedback-panel"
    >
      <div className="panel-heading teacher-heading">
        <div>
          <p className="section-label">교사용 피드백</p>
          <h2>학생 제출 자료와 AI 피드백</h2>
        </div>
        <span className="status-pill">교사 확인 후 전달</span>
      </div>

      <p className="teacher-boundary-note">
        AI 피드백은 초안입니다. 학생에게 전달하기 전 교사가 과학 내용,
        개인정보 포함 여부, 표현을 반드시 확인합니다. 자동 채점이나 성취도
        판정으로 사용하지 않습니다.
      </p>
      {statusMessage ? (
        <p className="activity-result-status" data-testid="teacher-feedback-status">
          {statusMessage}
        </p>
      ) : null}

      <div className="teacher-feedback-layout">
        <nav className="activity-list" aria-label="학생 제출 목록">
          {submissions.map((submission) => (
            <button
              className={
                submission.id === selectedSubmission?.id
                  ? 'activity-template-button active'
                  : 'activity-template-button'
              }
              data-testid={`submission-item-${submission.id}`}
              key={submission.id}
              type="button"
              onClick={() => {
                onSelectSubmission(submission.id);
              }}
            >
              <span>
                {submission.snapshot.activityTitle ??
                  submission.snapshot.moleculeName ??
                  '제출 자료'}
              </span>
              <small>
                {submission.studentDisplayName ?? '익명 학생'} ·{' '}
                {formatSubmissionStatus(submission.status)}
              </small>
            </button>
          ))}
        </nav>

        {selectedSubmission ? (
          <div className="teacher-feedback-content">
            <div className="teacher-card">
              <p className="section-label">선택한 제출 자료</p>
              <dl className="teacher-info-grid">
                <div>
                  <dt>학생 표시명</dt>
                  <dd>{selectedSubmission.studentDisplayName ?? '익명 학생'}</dd>
                </div>
                <div>
                  <dt>수업코드</dt>
                  <dd>{selectedSubmission.classCode ?? '없음'}</dd>
                </div>
                <div>
                  <dt>제출 시각</dt>
                  <dd>{formatKoreanDateTime(selectedSubmission.submittedAt)}</dd>
                </div>
                <div>
                  <dt>활동명</dt>
                  <dd>{selectedSubmission.snapshot.activityTitle ?? '없음'}</dd>
                </div>
                <div>
                  <dt>분자명</dt>
                  <dd>{selectedSubmission.snapshot.moleculeName ?? '없음'}</dd>
                </div>
                <div>
                  <dt>상태</dt>
                  <dd>{formatSubmissionStatus(selectedSubmission.status)}</dd>
                </div>
              </dl>
            </div>

            <div className="teacher-grid">
              <div className="teacher-card compact">
                <p className="section-label">구조 확인 요약</p>
                <p>
                  {selectedSubmission.snapshot.rdkitValidation.isValid
                    ? `${selectedSubmission.snapshot.rdkitValidation.molecularFormula ?? '분자식 없음'} / 평균 분자량 ${
                        selectedSubmission.snapshot.rdkitValidation.molecularWeight?.toFixed(
                          3,
                        ) ?? '없음'
                      }`
                    : '구조 확인 전 또는 실패'}
                </p>
              </div>
              <div className="teacher-card compact">
                <p className="section-label">학생 정리</p>
                <p>
                  {selectedSubmission.snapshot.finalReflection ??
                    selectedSubmission.snapshot.afterValidationReflection ??
                    '아직 정리 문항이 충분히 작성되지 않았습니다.'}
                </p>
              </div>
            </div>

            <div className="teacher-card">
              <div className="teacher-feedback-actions">
                <div>
                  <p className="section-label">AI 피드백 초안</p>
                  <p>
                    서버 엔드포인트가 연결되어 있으면 AI API로 초안을 만들고,
                    없으면 교사용 로컬 검토 초안을 만듭니다.
                  </p>
                </div>
                <button
                  className="secondary-action"
                  data-testid="create-ai-feedback-draft-button"
                  type="button"
                  disabled={draftStatus === 'loading'}
                  onClick={() => {
                    onCreateFeedbackDraft(selectedSubmission.id);
                  }}
                >
                  {draftStatus === 'loading'
                    ? '피드백 초안 생성 중'
                    : 'AI 피드백 초안 만들기'}
                </button>
              </div>

              {selectedSubmission.teacherFeedback ? (
                <div className="teacher-feedback-draft">
                  <p className="section-label">
                    초안 출처:{' '}
                    {selectedSubmission.teacherFeedback.source === 'ai_api'
                      ? 'AI API'
                      : '로컬 검토 초안'}
                  </p>
                  <p>{selectedSubmission.teacherFeedback.summary}</p>
                  <p className="teacher-boundary-note">
                    {selectedSubmission.teacherFeedback.teacherReviewNote}
                  </p>
                  <label className="teacher-feedback-editor">
                    <span>학생에게 전달할 피드백</span>
                    <textarea
                      data-testid="teacher-feedback-student-message-input"
                      value={editedStudentMessage}
                      onChange={(event) => {
                        setEditedStudentMessage(event.currentTarget.value);
                      }}
                    />
                  </label>
                  <button
                    className="primary-action"
                    data-testid="return-feedback-button"
                    type="button"
                    disabled={!editedStudentMessage.trim()}
                    onClick={() => {
                      onReturnFeedback(
                        selectedSubmission.id,
                        editedStudentMessage,
                      );
                    }}
                  >
                    교사 확인 후 학생에게 전달
                  </button>
                </div>
              ) : (
                <p className="teacher-boundary-note">
                  아직 피드백 초안이 없습니다. 먼저 AI 피드백 초안을 만든 뒤
                  교사가 확인해 전달하세요.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatSubmissionStatus(status: ActivitySubmission['status']): string {
  switch (status) {
    case 'submitted':
      return '제출됨';
    case 'feedback_draft':
      return '피드백 초안 작성됨';
    case 'feedback_returned':
      return '피드백 전달 완료';
  }
}
