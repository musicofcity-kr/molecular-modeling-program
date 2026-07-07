import { useState } from 'react';
import type { ActivityTemplate } from '../../types/activity';
import type { ActivitySubmission } from '../../types/feedback';
import type { TeacherAuthorizationStatus } from '../../types/session';
import type { ClassroomDraft } from '../../services/firebase/classroomRepository';
import { formatKoreanDateTime } from '../../utils/formatKoreanDateTime';

const TEACHER_DASHBOARD_ITEMS = [
  {
    title: '수업방 생성',
    body: '수업명, 수업코드, 사용할 활동 템플릿을 고르는 화면을 이후 Firestore 연결 단계에서 활성화합니다.',
  },
  {
    title: '활동 관리',
    body: '분자 예시와 탐구 활동 템플릿을 수업방에 배정하는 교사용 작업 흐름을 준비합니다.',
  },
  {
    title: '제출 목록',
    body: '학생 익명 ID 기준 제출 현황을 표시할 자리입니다. 현재 단계에서는 서버 저장과 목록 조회를 하지 않습니다.',
  },
];

type TeacherDashboardPlaceholderProps = {
  authorizationStatus?: TeacherAuthorizationStatus;
  templates?: ActivityTemplate[];
  statusMessage?: string;
  statusTone?: 'info' | 'success' | 'warning';
  developerLogs?: string[];
  submissions?: ActivitySubmission[];
  selectedSubmissionId?: string | null;
  isEmergencyAccess?: boolean;
  onCreateClassroom?: (draft: ClassroomDraft) => void;
  onLoadSubmissions?: (classCode: string) => void;
  onSelectSubmission?: (submissionId: string) => void;
  onSignOut?: () => void;
};

function formatAuthorizationLabel(
  status: TeacherAuthorizationStatus | undefined,
  isEmergencyAccess = false,
): string {
  if (isEmergencyAccess) {
    return '긴급 교사용 보기';
  }

  if (status === 'authorized') {
    return '교사 권한 확인 완료';
  }

  if (status === 'not_checked') {
    return '교사 권한 확인 필요';
  }

  return '교사 권한 승인 대기';
}

function formatAuthorizationHelp(
  status: TeacherAuthorizationStatus | undefined,
  isEmergencyAccess = false,
): string {
  if (isEmergencyAccess) {
    return '긴급 로그인으로 교사용 안내 화면에 진입했습니다. Firebase ID token이 없으므로 서버 제출 조회, 수업방 생성, 피드백 반환은 Firebase 교사 로그인으로만 사용할 수 있습니다.';
  }

  if (status === 'authorized') {
    return '교사 custom claim이 확인되었습니다. 수업방 생성과 제출 목록 조회를 Firestore 규칙 범위에서 사용할 수 있습니다.';
  }

  if (status === 'not_checked') {
    return '로그인은 되었지만 ID token의 교사 권한 정보를 확인하지 못했습니다. Firebase 설정과 토큰 갱신 상태를 확인해야 합니다.';
  }

  return '로그인은 되었지만 아직 teacher custom claim이 없습니다. 교사용 비공개 자료와 서버 저장 기능은 열지 않습니다.';
}

export function TeacherDashboardPlaceholder({
  authorizationStatus,
  templates = [],
  statusMessage,
  statusTone = 'info',
  developerLogs = [],
  submissions = [],
  selectedSubmissionId,
  isEmergencyAccess = false,
  onCreateClassroom,
  onLoadSubmissions,
  onSelectSubmission,
  onSignOut,
}: TeacherDashboardPlaceholderProps) {
  const [title, setTitle] = useState('고1 화학 분자구조 탐구');
  const [classCode, setClassCode] = useState('CHEM-101');
  const [joinCode, setJoinCode] = useState('1010');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    templates.slice(0, 3).map((template) => template.id),
  );
  const canUseFirestoreTools =
    authorizationStatus === 'authorized' &&
    !isEmergencyAccess &&
    Boolean(onCreateClassroom) &&
    Boolean(onLoadSubmissions);
  const selectedSubmission =
    submissions.find((submission) => submission.id === selectedSubmissionId) ??
    submissions[0] ??
    null;

  const toggleTemplate = (templateId: string) => {
    setSelectedTemplateIds((currentIds) =>
      currentIds.includes(templateId)
        ? currentIds.filter((id) => id !== templateId)
        : [...currentIds, templateId],
    );
  };

  return (
    <section
      className="workspace-panel entry-panel teacher-dashboard-placeholder"
      data-testid="teacher-dashboard-placeholder"
    >
      <div className="panel-heading teacher-entry-heading">
        <div>
          <p className="section-label">교사용 대시보드 준비</p>
          <h2>인증 기반 수업 운영 화면의 뼈대입니다</h2>
        </div>
        <div className="teacher-dashboard-actions">
          <span className="status-pill">
            {formatAuthorizationLabel(authorizationStatus, isEmergencyAccess)}
          </span>
          <span className="status-pill">
            {canUseFirestoreTools ? 'Firestore 연결 가능' : 'Firestore 권한 필요'}
          </span>
          {onSignOut ? (
            <button
              className="secondary-action compact-action"
              data-testid="teacher-sign-out-button"
              type="button"
              onClick={onSignOut}
            >
              로그아웃
            </button>
          ) : null}
        </div>
      </div>
      <p className="entry-help">
        이 영역은 Firebase Auth와 Firestore Security Rules가 준비된 뒤 실제
        교사용 대시보드로 연결합니다. 지금은 기존 분자구조 모델링 기능과
        교사용 안내를 검토하는 placeholder입니다.
      </p>
      <p className="entry-security-note">
        {formatAuthorizationHelp(authorizationStatus, isEmergencyAccess)}
      </p>
      {statusMessage ? (
        <p
          className={`activity-result-status ${statusTone}`}
          data-testid="teacher-classroom-status"
        >
          {statusMessage}
        </p>
      ) : null}
      {developerLogs.length > 0 ? (
        <details
          className="teacher-debug-details"
          data-testid="teacher-classroom-developer-logs"
        >
          <summary>교사용 서버 진단 정보 보기</summary>
          <ul>
            {developerLogs.map((log) => (
              <li key={log}>{log}</li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="teacher-classroom-grid">
        <form
          className="teacher-classroom-form teacher-placeholder-card"
          onSubmit={(event) => {
            event.preventDefault();
            onCreateClassroom?.({
              title,
              classCode,
              joinCode,
              activityTemplateIds: selectedTemplateIds,
            });
          }}
        >
          <p className="section-label">수업방 생성</p>
          <label>
            <span>수업명</span>
            <input
              data-testid="teacher-classroom-title-input"
              aria-label="수업명"
              value={title}
              disabled={!canUseFirestoreTools}
              onChange={(event) => {
                setTitle(event.currentTarget.value);
              }}
            />
          </label>
          <label>
            <span>수업코드</span>
            <input
              data-testid="teacher-classroom-code-input"
              aria-label="교사용 수업코드"
              value={classCode}
              disabled={!canUseFirestoreTools}
              onChange={(event) => {
                setClassCode(event.currentTarget.value.toUpperCase());
              }}
            />
          </label>
          <label>
            <span>학생 입장 확인코드</span>
            <input
              data-testid="teacher-classroom-join-code-input"
              aria-label="학생 입장 확인코드"
              value={joinCode}
              disabled={!canUseFirestoreTools}
              onChange={(event) => {
                setJoinCode(event.currentTarget.value.toUpperCase());
              }}
            />
          </label>
          <div className="teacher-template-checklist">
            <p className="section-label">활동 템플릿</p>
            {templates.map((template) => (
              <label key={template.id}>
                <input
                  type="checkbox"
                  checked={selectedTemplateIds.includes(template.id)}
                  disabled={!canUseFirestoreTools}
                  onChange={() => {
                    toggleTemplate(template.id);
                  }}
                />
                <span>{template.title}</span>
              </label>
            ))}
          </div>
          <button
            className="primary-action"
            data-testid="create-firestore-classroom-button"
            type="submit"
            disabled={!canUseFirestoreTools}
          >
            수업방 만들기
          </button>
          <p className="teacher-boundary-note">
            학생에게 수업코드와 입장 확인코드를 함께 안내합니다. 서버는 두 값이
            일치할 때만 학생 멤버십을 만듭니다.
          </p>
        </form>

        <form
          className="teacher-classroom-form teacher-placeholder-card"
          onSubmit={(event) => {
            event.preventDefault();
            onLoadSubmissions?.(classCode);
          }}
        >
          <p className="section-label">서버 제출 목록</p>
          <p>
            Firestore에 저장된 제출 자료를 수업코드 기준으로 불러옵니다.
            교사 권한이 확인된 계정만 접근할 수 있습니다.
          </p>
          <label>
            <span>조회할 수업코드</span>
            <input
              data-testid="teacher-submission-class-code-input"
              aria-label="제출 목록 수업코드"
              value={classCode}
              disabled={!canUseFirestoreTools}
              onChange={(event) => {
                setClassCode(event.currentTarget.value.toUpperCase());
              }}
            />
          </label>
          <button
            className="secondary-action"
            data-testid="load-firestore-submissions-button"
            type="submit"
            disabled={!canUseFirestoreTools}
          >
            서버 제출 목록 불러오기
          </button>
          <p className="teacher-boundary-note">
            현재 브라우저 제출함도 계속 유지됩니다. 서버 조회가 실패해도 기존
            로컬 제출 자료는 삭제하지 않습니다.
          </p>
          {submissions.length > 0 ? (
            <div
              className="teacher-server-submissions"
              data-testid="teacher-server-submissions"
            >
              <div className="teacher-server-submissions-heading">
                <p className="section-label">불러온 제출 자료</p>
                <span className="status-pill">{submissions.length}건</span>
              </div>
              <nav className="activity-list" aria-label="서버 제출 자료 목록">
                {submissions.map((submission) => (
                  <button
                    className={
                      submission.id === selectedSubmission?.id
                        ? 'activity-template-button active'
                        : 'activity-template-button'
                    }
                    data-testid={`teacher-server-submission-${submission.id}`}
                    key={submission.id}
                    type="button"
                    onClick={() => {
                      onSelectSubmission?.(submission.id);
                    }}
                  >
                    <span>
                      {submission.snapshot.activityTitle ??
                        submission.snapshot.moleculeName ??
                        '제출 자료'}
                    </span>
                    <small>
                      {submission.studentDisplayName ?? '익명 학생'} ·{' '}
                      {formatKoreanDateTime(submission.submittedAt)}
                    </small>
                  </button>
                ))}
              </nav>
              {selectedSubmission ? (
                <dl
                  className="teacher-info-grid teacher-server-submission-summary"
                  data-testid="teacher-server-submission-summary"
                >
                  <div>
                    <dt>학생</dt>
                    <dd>{selectedSubmission.studentDisplayName ?? '익명 학생'}</dd>
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
                    <dt>구조 확인</dt>
                    <dd>
                      {selectedSubmission.snapshot.rdkitValidation.isValid
                        ? '확인 완료'
                        : '확인 전 또는 실패'}
                    </dd>
                  </div>
                  <div>
                    <dt>분자식</dt>
                    <dd>
                      {selectedSubmission.snapshot.rdkitValidation
                        .molecularFormula ?? '없음'}
                    </dd>
                  </div>
                  <div>
                    <dt>제출 상태</dt>
                    <dd>{formatSubmissionStatus(selectedSubmission.status)}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          ) : (
            <p className="teacher-boundary-note">
              제출 목록을 불러온 뒤 학생 제출 자료가 이 영역에 표시됩니다.
            </p>
          )}
        </form>
      </div>

      <div className="teacher-placeholder-grid">
        {TEACHER_DASHBOARD_ITEMS.map((item) => (
          <article className="teacher-placeholder-card" key={item.title}>
            <p className="section-label">{item.title}</p>
            <p>{item.body}</p>
          </article>
        ))}
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
