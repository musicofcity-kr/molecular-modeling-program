import type { ReactNode } from 'react';
import type { UserMode } from '../../types/activity';
import type { ActivityResultSnapshot } from '../../types/activityResult';

type ActivityResultPanelProps = {
  userMode: UserMode;
  currentSnapshot: ActivityResultSnapshot;
  previewSnapshot?: ActivityResultSnapshot | null;
  savedResults: ActivityResultSnapshot[];
  statusMessage?: string;
  onSave: () => void;
  onPreviewSavedResult: (snapshotId: string) => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportTxt: () => void;
  onCopyMarkdown: () => void;
  onPrint: () => void;
};

export function ActivityResultPanel({
  userMode,
  currentSnapshot,
  previewSnapshot,
  savedResults,
  statusMessage,
  onSave,
  onPreviewSavedResult,
  onExportJson,
  onExportMarkdown,
  onExportTxt,
  onCopyMarkdown,
  onPrint,
}: ActivityResultPanelProps) {
  const snapshot = previewSnapshot ?? currentSnapshot;
  const hasSavedResults = savedResults.length > 0;

  return (
    <section
      className="workspace-panel activity-result-panel"
      data-testid="activity-result-panel"
    >
      <div className="panel-heading activity-result-heading">
        <div>
          <p className="section-label">수업 제출 자료</p>
          <h2>활동 결과 요약</h2>
        </div>
        <span className="status-pill">자동 채점 없음</span>
      </div>

      <p className="activity-result-notice">
        아래 내용은 수업 활동 결과 요약입니다. 필요한 경우 복사하거나
        내보낼 수 있습니다.
      </p>
      <p className="activity-result-storage-note">
        로컬 저장은 현재 브라우저에만 보관됩니다. 다른 기기나 브라우저에서는
        보이지 않습니다.
      </p>
      {statusMessage ? (
        <p className="activity-result-status" data-testid="activity-result-status">
          {statusMessage}
        </p>
      ) : null}

      <div className="activity-result-actions">
        <button className="primary-action" type="button" onClick={onSave}>
          로컬 저장
        </button>
        <button className="secondary-action" type="button" onClick={onExportJson}>
          JSON 내보내기
        </button>
        <button className="secondary-action" type="button" onClick={onExportMarkdown}>
          Markdown 내보내기
        </button>
        <button className="secondary-action" type="button" onClick={onExportTxt}>
          TXT 내보내기
        </button>
        <button className="secondary-action" type="button" onClick={onCopyMarkdown}>
          클립보드 복사
        </button>
        <button className="secondary-action" type="button" onClick={onPrint}>
          인쇄
        </button>
      </div>

      <div className="activity-result-layout">
        <div className="activity-result-summary">
          <ActivityResultBlock title="활동 정보">
            <ResultRow label="활동명" value={snapshot.activityTitle} />
            <ResultRow label="분자명" value={snapshot.moleculeName} />
            <ResultRow label="작성 시각" value={snapshot.createdAt} />
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

          <ActivityResultBlock title="RDKit 검증 결과">
            <ResultRow
              label="검증 상태"
              value={snapshot.rdkitValidation.isValid ? '검증 완료' : '미검증 또는 실패'}
            />
            <ResultRow
              label="canonical SMILES"
              value={snapshot.rdkitValidation.canonicalSmiles}
            />
            <ResultRow
              label="molecularFormula"
              value={snapshot.rdkitValidation.molecularFormula}
            />
            <ResultRow
              label="molecularWeight"
              value={
                typeof snapshot.rdkitValidation.molecularWeight === 'number'
                  ? snapshot.rdkitValidation.molecularWeight.toFixed(3)
                  : undefined
              }
            />
          </ActivityResultBlock>

          <ActivityResultBlock title="3D 구조 관찰">
            <ResultRow
              label="3D 구조 출처"
              value={snapshot.threeDObservation.sourceLabel}
            />
            <ResultRow
              label="3D 관찰 내용"
              value={snapshot.threeDObservation.studentObservation}
            />
            <ResultRow
              label="좌표 안내"
              value={snapshot.threeDObservation.sourceNote}
            />
          </ActivityResultBlock>

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

          <ActivityResultBlock title="VSEPR 예측 결과">
            <ResultRow label="AXE 표기" value={snapshot.vseprResult?.axeNotation} />
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
            <ResultRow label="신뢰도" value={snapshot.vseprResult?.confidence} />
          </ActivityResultBlock>

          <ActivityResultBlock title="실제/외부 3D 구조와 VSEPR 모형 비교 관찰">
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
            {snapshot.activityAnswers.length > 0 ? (
              <ul className="activity-result-list">
                {snapshot.activityAnswers.map((answer) => (
                  <li key={answer.questionId}>
                    <strong>{answer.questionText}</strong>
                    <span>{answer.answer || '미입력'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>저장된 활동 문항 답변이 없습니다.</p>
            )}
            <ResultRow label="최종 소감 또는 수정된 생각" value={snapshot.finalReflection} />
          </ActivityResultBlock>
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
                    <small>{savedResult.createdAt}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>아직 이 브라우저에 저장된 결과가 없습니다.</p>
            )}
          </div>

          <div className="activity-result-card">
            <p className="section-label">내보내기 안내</p>
            <p>{snapshot.exportNotice}</p>
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
                예측값, RDKit 검증값, 좌표 출처, 측정 결과, VSEPR 예측, 비교
                관찰, 정리 답변을 포함합니다. 개발자 로그와 원본 API 응답은
                포함하지 않습니다.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
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
