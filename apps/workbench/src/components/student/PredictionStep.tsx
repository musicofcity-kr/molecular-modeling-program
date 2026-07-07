import type { ActivityQuestion, ActivityResponseState } from '../../types/activity';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

type PredictionStepProps = {
  questions: ActivityQuestion[];
  responses: ActivityResponseState;
  onResponseChange: (questionId: string, value: string) => void;
  collapsible?: boolean;
};

function isLongAnswerQuestion(questionId: string): boolean {
  return questionId === 'drawingReason' || questionId.endsWith('Reflection');
}

export function PredictionStep({
  questions,
  responses,
  onResponseChange,
  collapsible,
}: PredictionStepProps) {
  return (
    <CollapsibleStudentStep
      id="student-step-2"
      className="student-step prediction-step phase-predict"
      testId="prediction-step"
      stepNumber={2}
      sectionLabel="예측 입력하기"
      title="분자 구조를 그리기 전에 먼저 예상해 봅니다"
      collapsible={collapsible}
    >
      <div className="student-question-grid">
        {questions.map((question) => (
          <label className="activity-question" key={question.id}>
            <span>{question.label}</span>
            {isLongAnswerQuestion(question.id) ? (
              <textarea
                data-testid={`prediction-input-${question.id}`}
                value={responses[question.id] ?? ''}
                placeholder={question.placeholder}
                onChange={(event) => {
                  onResponseChange(question.id, event.currentTarget.value);
                }}
              />
            ) : (
              <input
                data-testid={`prediction-input-${question.id}`}
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
    </CollapsibleStudentStep>
  );
}
