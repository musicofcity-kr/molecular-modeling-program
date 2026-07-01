import type { ActivityQuestion, ActivityResponseState } from '../../types/activity';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

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
    <CollapsibleStudentStep
      className="student-step reflection-step phase-reflect"
      testId="reflection-step"
      stepNumber={6}
      sectionLabel="정리 작성하기"
      title="예측과 확인 결과를 비교해 기록합니다"
    >
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
    </CollapsibleStudentStep>
  );
}
