import { useId, useState, type ReactNode } from 'react';
import type { UserMode } from '../../types/activity';
import type {
  ActivityResultAnswer,
  ActivityResultSnapshot,
} from '../../types/activityResult';
import type { ActivitySubmission } from '../../types/feedback';
import { formatKoreanDateTime } from '../../utils/formatKoreanDateTime';

type ActivityResultPanelProps = {
  userMode: UserMode;
  currentSnapshot: ActivityResultSnapshot;
  previewSnapshot?: ActivityResultSnapshot | null;
  savedResults: ActivityResultSnapshot[];
  statusMessage?: string;
  submissionStatusMessage?: string;
  returnedFeedbacks?: ActivitySubmission[];
  onSave: () => void;
  onSubmitForTeacher?: () => void;
  onRefreshReturnedFeedback?: () => void;
  onPreviewSavedResult: (snapshotId: string) => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportTxt: () => void;
  onCopyMarkdown: () => void;
  onPrint: () => void;
};

function formatStudent3DSourceLabel(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  if (value.includes('PubChem') || value.includes('CID')) {
    return '외부 3D 자료';
  }

  if (value.includes('예제 내장')) {
    return '예제 내장 3D 자료';
  }

  return value
    .replace(/PubChem/g, '외부 자료')
    .replace(/\bCID\b/g, '후보 번호')
    .replace(/\bSDF\b/g, '3D 자료')
    .replace(/RDKit\.js/g, '구조 확인')
    .replace(/\bSMILES\b/g, '구조 문자열');
}

function formatStudent3DSourceNote(value: string | undefined): string | undefined {
  if (!value) {
    return value;
  }

  if (value.includes('PubChem') || value.includes('CID') || value.includes('SDF')) {
    return '외부 데이터베이스에서 불러온 교육용 참고 3D 자료입니다. 분자식과 평균 분자량의 기준은 구조 확인 결과입니다.';
  }

  return value
    .replace(/PubChem/g, '외부 자료')
    .replace(/\bCID\b/g, '후보 번호')
    .replace(/\bSDF\b/g, '3D 자료')
    .replace(/RDKit\.js/g, '구조 확인')
    .replace(/\bSMILES\b/g, '구조 문자열');
}

export function ActivityResultPanel({
  userMode,
  currentSnapshot,
  previewSnapshot,
  savedResults,
  statusMessage,
  submissionStatusMessage,
  returnedFeedbacks = [],
  onSave,
  onSubmitForTeacher,
  onRefreshReturnedFeedback,
  onPreviewSavedResult,
  onExportJson,
  onExportMarkdown,
  onExportTxt,
  onCopyMarkdown,
  onPrint,
}: ActivityResultPanelProps) {
  const snapshot = previewSnapshot ?? currentSnapshot;
  const hasSavedResults = savedResults.length > 0;
  const isTeacherMode = userMode === 'teacher';
  const answerGroups = buildActivityAnswerGroups(snapshot.activityAnswers);
  const completedAnswerCount = snapshot.activityAnswers.filter((answer) =>
    Boolean(answer.answer.trim()),
  ).length;
  const totalAnswerCount = snapshot.activityAnswers.length;
  const [isSectionOpen, setIsSectionOpen] = useState(true);
  const contentId = useId();

  return (
    <section
      id="student-step-7"
      className={`workspace-panel activity-result-panel ${
        isSectionOpen ? 'is-open' : 'is-collapsed'
      }`}
      data-testid="activity-result-panel"
      tabIndex={-1}
    >
      <div className="panel-heading activity-result-heading">
        <button
          className="panel-tab-button"
          type="button"
          aria-expanded={isSectionOpen}
          aria-controls={contentId}
          onClick={() => {
            setIsSectionOpen((current) => !current);
          }}
        >
          <span className="section-label">수업 제출 자료</span>
          <span className="panel-tab-title">활동 결과 정리</span>
          <span className="student-step-toggle">
            {isSectionOpen ? '접기' : '열기'}
          </span>
        </button>
        <span className="status-pill">자동 채점 없음</span>
      </div>

      <div className="collapsible-panel-content" id={contentId} hidden={!isSectionOpen}>
      <p className="activity-result-notice">
        아래 내용은 수업 활동 결과 요약입니다. 필요한 경우 임시 저장하거나
        보고서로 저장할 수 있습니다.
      </p>
      <p className="activity-result-storage-note">
        임시 저장은 현재 사용하는 브라우저에만 보관됩니다. 다른 기기나
        브라우저에서는 보이지 않습니다. 최근 결과는 최대 10개까지만 보관되며,
        오래된 결과는 새 저장 결과에 밀려날 수 있습니다.
      </p>
      <div className="activity-result-progress" aria-label="활동 문항 작성 현황">
        <strong>
          {completedAnswerCount} / {totalAnswerCount || 0} 문항 작성됨
        </strong>
        <span>나의 예측, 확인과 비교, 성찰을 나누어 정리합니다.</span>
      </div>
      {statusMessage ? (
        <p
          className="activity-result-status"
          data-testid="activity-result-status"
          role="status"
        >
          {statusMessage}
        </p>
      ) : null}
      {submissionStatusMessage ? (
        <p
          className="activity-result-status"
          data-testid="activity-submission-status"
          role="status"
        >
          {submissionStatusMessage}
        </p>
      ) : null}

      <div className="activity-result-actions">
        <button className="primary-action" type="button" onClick={onSave}>
          임시 저장하기
        </button>
        {!isTeacherMode && onSubmitForTeacher ? (
          <button
            className="secondary-action"
            data-testid="submit-activity-result-button"
            type="button"
            onClick={onSubmitForTeacher}
          >
            교사에게 제출하기
          </button>
        ) : null}
        {!isTeacherMode && onRefreshReturnedFeedback ? (
          <button
            className="secondary-action"
            data-testid="refresh-returned-feedback-button"
            type="button"
            onClick={onRefreshReturnedFeedback}
          >
            교사 피드백 확인하기
          </button>
        ) : null}
        <button className="secondary-action" type="button" onClick={onExportMarkdown}>
          보고서로 저장하기
        </button>
        <button className="secondary-action" type="button" onClick={onPrint}>
          활동지 인쇄하기
        </button>
        {isTeacherMode ? (
          <>
            <button className="secondary-action" type="button" onClick={onCopyMarkdown}>
              결과 복사하기
            </button>
            <button className="secondary-action" type="button" onClick={onExportJson}>
              원자료 저장
            </button>
            <button className="secondary-action" type="button" onClick={onExportMarkdown}>
              보고서로 저장
            </button>
            <button className="secondary-action" type="button" onClick={onExportTxt}>
              텍스트로 저장
            </button>
          </>
        ) : null}
      </div>

      <div className="activity-result-layout">
        <div className="activity-result-summary">
          <ActivityResultBlock title="활동 정보">
            <ResultRow label="활동명" value={snapshot.activityTitle} />
            <ResultRow label="분자명" value={snapshot.moleculeName} />
            <ResultRow
              label="작성 시각"
              value={formatKoreanDateTime(snapshot.createdAt)}
            />
          </ActivityResultBlock>

          <ActivityResultBlock title="나의 예측">
            <ResultRow
              label="내가 예상한 분자식"
              value={snapshot.studentPrediction.predictedFormula}
            />
            <ResultRow
              label="내가 예상한 분자량"
              value={snapshot.studentPrediction.predictedMolecularWeight}
            />
            <ResultRow
              label="구조를 그렇게 그린 이유"
              value={snapshot.studentPrediction.drawingReason}
            />
          </ActivityResultBlock>

          <ActivityResultBlock title="구조 확인 결과">
            <ResultRow
              label="확인 상태"
              value={
                snapshot.rdkitValidation.isValid
                  ? '구조 확인 완료'
                  : '구조를 다시 확인해 주세요'
              }
            />
            <ResultRow
              label="분자식"
              value={snapshot.rdkitValidation.molecularFormula}
            />
            <ResultRow
              label="평균 분자량"
              value={
                typeof snapshot.rdkitValidation.molecularWeight === 'number'
                  ? snapshot.rdkitValidation.molecularWeight.toFixed(3)
                  : undefined
              }
            />
            {isTeacherMode ? (
              <ResultRow
                label="표준 구조 표현"
                value={snapshot.rdkitValidation.canonicalSmiles}
              />
            ) : null}
          </ActivityResultBlock>

          <ActivityResultBlock title="3D 구조 관찰">
            <ResultRow
              label="참고 3D 구조 출처"
              value={
                isTeacherMode
                  ? snapshot.threeDObservation.sourceLabel
                  : formatStudent3DSourceLabel(snapshot.threeDObservation.sourceLabel)
              }
            />
            <ResultRow
              label="3D 구조 관찰 내용"
              value={snapshot.threeDObservation.studentObservation}
            />
            <ResultRow
              label="좌표 안내"
              value={
                isTeacherMode
                  ? snapshot.threeDObservation.sourceNote
                  : formatStudent3DSourceNote(snapshot.threeDObservation.sourceNote)
              }
            />
          </ActivityResultBlock>

          {isTeacherMode ? (
            <ActivityResultBlock title="결합길이/결합각 측정 결과">
              {snapshot.measurements.length > 0 ? (
                <ul className="activity-result-list">
                  {snapshot.measurements.map((measurement) => (
                    <li key={`${measurement.type}-${measurement.label}-${measurement.value}`}>
                      <strong>{measurement.label}</strong>
                      <span>
                        {measurement.value.toFixed(
                          measurement.unit === 'angstrom' ? 2 : 1,
                        )}
                        {measurement.unit === 'angstrom' ? ' Å' : '°'}
                      </span>
                      <small>{measurement.sourceNote}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>최근 측정 결과가 없습니다.</p>
              )}
            </ActivityResultBlock>
          ) : null}

          <ActivityResultBlock title="입체 구조 예상 결과">
            {isTeacherMode ? (
              <ResultRow label="전자쌍 모형 표기" value={snapshot.vseprResult?.axeNotation} />
            ) : null}
            <ResultRow
              label="전자쌍 배열"
              value={snapshot.vseprResult?.electronGeometryKo}
            />
            <ResultRow
              label="분자 구조"
              value={snapshot.vseprResult?.molecularGeometryKo}
            />
            <ResultRow
              label="예상 결합각"
              value={snapshot.vseprResult?.idealBondAngle}
            />
            <ResultRow label="확인 수준" value={snapshot.vseprResult?.confidence} />
          </ActivityResultBlock>

          <ActivityResultBlock title="참고 3D 구조와 예상 입체 모형 비교 관찰">
            <ResultRow
              label="비슷한 점"
              value={snapshot.comparisonObservation?.observedSimilarities}
            />
            <ResultRow
              label="다른 점"
              value={snapshot.comparisonObservation?.observedDifferences}
            />
            <ResultRow
              label="알게 된 점"
              value={snapshot.comparisonObservation?.studentReflection}
            />
          </ActivityResultBlock>

          <ActivityResultBlock title="정리 문항 답변">
            {answerGroups.length > 0 ? (
              <div className="activity-answer-groups">
                {answerGroups.map((group) => (
                  <section className="activity-answer-group" key={group.title}>
                    <div className="activity-answer-group-heading">
                      <strong>{group.title}</strong>
                      <span>
                        {group.completed} / {group.answers.length} 작성
                      </span>
                    </div>
                    <ul className="activity-result-list">
                      {group.answers.map((answer) => (
                        <li key={answer.questionId}>
                          <strong>{answer.questionText}</strong>
                          <span>{answer.answer || '아직 작성하지 않음'}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p>저장된 활동 문항 답변이 없습니다.</p>
            )}
            <ResultRow
              label="확인 후 수정한 생각"
              value={snapshot.afterValidationReflection}
            />
            <ResultRow label="최종 소감" value={snapshot.finalReflection} />
          </ActivityResultBlock>

          {!isTeacherMode ? (
            <ActivityResultBlock title="교사 피드백">
              {returnedFeedbacks.length > 0 ? (
                <ul className="activity-result-list teacher-feedback-return-list">
                  {returnedFeedbacks.map((submission) => (
                    <li key={submission.id}>
                      <strong>
                        {submission.snapshot.activityTitle ??
                          submission.snapshot.moleculeName ??
                          '활동 피드백'}
                      </strong>
                      <span>
                        {submission.teacherFeedback?.studentMessage ??
                          '피드백 내용이 없습니다.'}
                      </span>
                      <small>
                        {submission.feedbackReturnedAt
                          ? formatKoreanDateTime(submission.feedbackReturnedAt)
                          : '전달 시각 없음'}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  아직 교사가 전달한 피드백이 없습니다. 활동 결과를 제출한 뒤
                  교사의 확인을 기다려 주세요.
                </p>
              )}
            </ActivityResultBlock>
          ) : null}
        </div>

        <aside className="activity-result-side">
          <div className="activity-result-card">
            <p className="section-label">최근 저장 결과</p>
            {hasSavedResults ? (
              <ul className="saved-result-list">
                {savedResults.map((savedResult) => (
                  <li key={savedResult.id}>
                    <button
                      className="secondary-action"
                      type="button"
                      onClick={() => {
                        onPreviewSavedResult(savedResult.id);
                      }}
                    >
                      {savedResult.activityTitle ?? savedResult.moleculeName ?? '저장 결과'}
                    </button>
                    <small>{formatKoreanDateTime(savedResult.createdAt)}</small>
                  </li>
                ))}
              </ul>
            ) : (
            <p>아직 이 브라우저에 임시 저장된 결과가 없습니다.</p>
            )}
          </div>

          <div className="activity-result-card">
            <p className="section-label">내보내기 안내</p>
            <p>
              {isTeacherMode
                ? snapshot.exportNotice
                : '이 결과는 수업 활동 기록용입니다. 구조 확인 결과와 3D 관찰, 입체 구조 예상은 각각의 출처와 한계를 구분해 사용하세요.'}
            </p>
          </div>

          {userMode === 'teacher' ? (
            <div className="activity-result-card teacher-export-card">
              <p className="section-label">교사용 확인</p>
              <p>
                이 결과는 자동 채점 결과가 아니라 학생의 예측, 관찰, 검증,
                해석 기록입니다.
              </p>
              <p className="section-label">내보내기 포함 항목</p>
              <p>
                예측값, 구조 확인값, 좌표 출처, 측정 결과, 입체 구조 예상, 비교
                관찰, 정리 답변을 포함합니다. 개발자 로그와 원본 API 응답은
                포함하지 않습니다.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
      </div>
    </section>
  );
}

function buildActivityAnswerGroups(answers: ActivityResultAnswer[]) {
  const predictionIds = new Set([
    'predictedFormula',
    'predictedMolecularWeight',
    'drawingReason',
    'predictedCentralAtom',
    'predictedBondingDomains',
    'predictedLonePairs',
    'predictedVseprShape',
  ]);
  const compareIds = new Set([
    'afterValidationReflection',
    'vseprReflection',
    'vseprModelElectronDomainObservation',
    'vseprModelLonePairEffect',
    'vseprModelVsPubChemObservation',
  ]);
  const groups = [
    {
      title: '나의 예측',
      answers: answers.filter((answer) => predictionIds.has(answer.questionId)),
    },
    {
      title: '확인과 비교',
      answers: answers.filter((answer) => compareIds.has(answer.questionId)),
    },
    {
      title: '성찰',
      answers: answers.filter(
        (answer) =>
          !predictionIds.has(answer.questionId) && !compareIds.has(answer.questionId),
      ),
    },
  ].filter((group) => group.answers.length > 0);

  return groups.map((group) => ({
    ...group,
    completed: group.answers.filter((answer) => Boolean(answer.answer.trim())).length,
  }));
}

function ActivityResultBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="activity-result-card">
      <p className="section-label">{title}</p>
      {children}
    </div>
  );
}

function ResultRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <dl className="activity-result-row">
      <dt>{label}</dt>
      <dd>{value?.trim() || '없음'}</dd>
    </dl>
  );
}
