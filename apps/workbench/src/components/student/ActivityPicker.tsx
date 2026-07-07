import type { ActivityTemplate } from '../../types/activity';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';

type ActivityPickerProps = {
  templates: ActivityTemplate[];
  selectedActivityId: string;
  onSelectActivity: (activityId: string) => void;
  collapsible?: boolean;
};

export function ActivityPicker({
  templates,
  selectedActivityId,
  onSelectActivity,
  collapsible,
}: ActivityPickerProps) {
  const selectedTemplate =
    templates.find((template) => template.id === selectedActivityId) ?? templates[0];

  if (!selectedTemplate) {
    return null;
  }

  return (
    <CollapsibleStudentStep
      id="student-step-1"
      className="student-step activity-picker phase-predict"
      testId="activity-picker"
      stepNumber={1}
      sectionLabel="오늘의 활동 선택하기"
      title={selectedTemplate.title}
      collapsible={collapsible}
    >
      <div className="activity-picker-layout">
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

        <div className="activity-target student-target-card">
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
              <dt>추천 분자 예시</dt>
              <dd>{selectedTemplate.recommendedExampleId ?? '직접 그리기'}</dd>
            </div>
          </dl>
        </div>
      </div>
    </CollapsibleStudentStep>
  );
}
