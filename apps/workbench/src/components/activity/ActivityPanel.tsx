import type {
  ActivityResponseState,
  ActivityTemplate,
  AppMode,
} from '../../types/activity';
import {
  buildActivityComparisonResult,
  type ActivityComparisonStatus,
} from '../../types/activity';
import type { MoleculeValidationResult } from '../../types/molecule';

type ActivityPanelProps = {
  appMode: AppMode;
  templates: ActivityTemplate[];
  selectedActivityId: string;
  responses: ActivityResponseState;
  validationResult: MoleculeValidationResult | null;
  onSelectActivity: (activityId: string) => void;
  onResponseChange: (questionId: string, value: string) => void;
};

function formatComparisonStatus(status: ActivityComparisonStatus): string {
  switch (status) {
    case 'not_validated':
      return '아직 검증 전';
    case 'not_answered':
      return '예상값 입력 전';
    case 'match':
      return '일치';
    case 'different':
      return '다름';
  }
}

function isLongAnswerQuestion(questionId: string): boolean {
  return questionId === 'drawingReason' || questionId.endsWith('Reflection');
}

export function ActivityPanel({
  appMode,
  templates,
  selectedActivityId,
  responses,
  validationResult,
  onSelectActivity,
  onResponseChange,
}: ActivityPanelProps) {
  if (appMode !== 'activity') {
    return null;
  }

  const selectedTemplate =
    templates.find((template) => template.id === selectedActivityId) ?? templates[0];

  if (!selectedTemplate) {
    return null;
  }

  const comparison = buildActivityComparisonResult(responses, validationResult);

  return (
    <section className="workspace-panel activity-panel" data-testid="activity-panel">
      <div className="panel-heading activity-heading">
        <div>
          <p className="section-label">수업 활동</p>
          <h2>수업용 활동 모드</h2>
        </div>
        <span className="status-pill">자동 채점 없음</span>
      </div>

      <div className="activity-layout">
        <nav className="activity-list" aria-label="활동 목록">
          {templates.map((template) => (
            <button
              className={
                template.id === selectedTemplate.id
                  ? 'activity-template-button active'
                  : 'activity-template-button'
              }
              data-testid={`activity-template-${template.id}`}
              key={template.id}
              type="button"
              onClick={() => {
                onSelectActivity(template.id);
              }}
            >
              <span>{template.title}</span>
              <small>{template.targetMoleculeName}</small>
            </button>
          ))}
        </nav>

        <div className="activity-content">
          <div className="activity-target">
            <div>
              <p className="section-label">학습 목표</p>
              <h3>{selectedTemplate.learningGoal}</h3>
            </div>
            <p>{selectedTemplate.prompt}</p>
            <dl>
              <div>
                <dt>그려야 할 분자</dt>
                <dd>{selectedTemplate.targetMoleculeName}</dd>
              </div>
              <div>
                <dt>추천 예제</dt>
                <dd>{selectedTemplate.recommendedExampleId ?? '없음'}</dd>
              </div>
            </dl>
          </div>

          <div className="activity-question-grid">
            <div>
              <p className="section-label">예측</p>
              {selectedTemplate.predictionQuestions.map((question) => (
                <label className="activity-question" key={question.id}>
                  <span>{question.label}</span>
                  {isLongAnswerQuestion(question.id) ? (
                    <textarea
                      value={responses[question.id] ?? ''}
                      placeholder={question.placeholder}
                      onChange={(event) => {
                        onResponseChange(question.id, event.currentTarget.value);
                      }}
                    />
                  ) : (
                    <input
                      value={responses[question.id] ?? ''}
                      placeholder={question.placeholder}
                      onChange={(event) => {
                        onResponseChange(question.id, event.currentTarget.value);
                      }}
                    />
                  )}
                </label>
              ))}
            </div>

            <div>
              <p className="section-label">정리</p>
              {selectedTemplate.reflectionQuestions.map((question) => (
                <label className="activity-question" key={question.id}>
                  <span>{question.label}</span>
                  <textarea
                    value={responses[question.id] ?? ''}
                    placeholder={question.placeholder}
                    onChange={(event) => {
                      onResponseChange(question.id, event.currentTarget.value);
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="activity-comparison" data-testid="activity-comparison">
            <div className="comparison-row">
              <span>학생 예상 분자식</span>
              <strong>{responses.predictedFormula?.trim() || '미입력'}</strong>
            </div>
            <div className="comparison-row">
              <span>RDKit 검증 분자식</span>
              <strong>{comparison.rdkitFormula ?? '아직 검증 전'}</strong>
            </div>
            <div className={`comparison-row ${comparison.formulaStatus}`}>
              <span>분자식 비교 결과</span>
              <strong>{formatComparisonStatus(comparison.formulaStatus)}</strong>
            </div>
            <div className="comparison-row">
              <span>학생 예상 분자량</span>
              <strong>{responses.predictedMolecularWeight?.trim() || '미입력'}</strong>
            </div>
            <div className="comparison-row">
              <span>RDKit 평균 분자량</span>
              <strong>{comparison.rdkitMolecularWeight ?? '아직 검증 전'}</strong>
            </div>
            <div className={`comparison-row ${comparison.molecularWeightStatus}`}>
              <span>분자량 비교 결과</span>
              <strong>
                {formatComparisonStatus(comparison.molecularWeightStatus)}
              </strong>
            </div>
            <p>
              비교는 단순 문자열 비교입니다. 분자식과 평균 분자량의 기준값은
              RDKit.js 검증 결과만 사용합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
