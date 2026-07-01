import type { ActivityTemplate } from '../../types/activity';

type ActivityPickerProps = {
  templates: ActivityTemplate[];
  selectedActivityId: string;
  onSelectActivity: (activityId: string) => void;
};

export function ActivityPicker({
  templates,
  selectedActivityId,
  onSelectActivity,
}: ActivityPickerProps) {
  const selectedTemplate =
    templates.find((template) => template.id === selectedActivityId) ?? templates[0];

  if (!selectedTemplate) {
    return null;
  }

  return (
    <section className="student-step activity-picker" data-testid="activity-picker">
      <div className="student-step-heading">
        <span className="student-step-number">1</span>
        <div>
          <p className="section-label">오늘의 활동 선택하기</p>
          <h2>{selectedTemplate.title}</h2>
        </div>
      </div>

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
    </section>
  );
}
