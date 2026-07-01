import type { ActivityQuestion, ActivityResponseState } from '../../types/activity';

type ReflectionStepProps = {
  questions: ActivityQuestion[];
  responses: ActivityResponseState;
  onResponseChange: (questionId: string, value: string) => void;
};

export function ReflectionStep({
  questions,
  responses,
  onResponseChange,
}: ReflectionStepProps) {
  return (
    <section className="student-step reflection-step" data-testid="reflection-step">
      <div className="student-step-heading">
        <span className="student-step-number">6</span>
        <div>
          <p className="section-label">정리 작성하기</p>
          <h2>예측과 확인 결과를 비교해 기록합니다</h2>
        </div>
      </div>

      <div className="student-question-grid">
        {questions.map((question) => (
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
    </section>
  );
}
