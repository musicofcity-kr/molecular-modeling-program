import type { ActivityQuestion, ActivityResponseState } from '../../types/activity';

type PredictionStepProps = {
  questions: ActivityQuestion[];
  responses: ActivityResponseState;
  onResponseChange: (questionId: string, value: string) => void;
};

function isLongAnswerQuestion(questionId: string): boolean {
  return questionId === 'drawingReason' || questionId.endsWith('Reflection');
}

export function PredictionStep({
  questions,
  responses,
  onResponseChange,
}: PredictionStepProps) {
  return (
    <section className="student-step prediction-step" data-testid="prediction-step">
      <div className="student-step-heading">
        <span className="student-step-number">2</span>
        <div>
          <p className="section-label">예측 입력하기</p>
          <h2>분자 구조를 그리기 전에 먼저 예상해 봅니다</h2>
        </div>
      </div>

      <div className="student-question-grid">
        {questions.map((question) => (
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
    </section>
  );
}
