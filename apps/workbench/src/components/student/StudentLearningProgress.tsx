export type StudentLearningStepId = 1 | 2 | 3 | 4 | 5;

export type StudentLearningStepStatus =
  | 'not-started'
  | 'current'
  | 'completed'
  | 'review'
  | 'error';

type StudentLearningProgressProps = {
  activeStep: StudentLearningStepId;
  statuses: Record<StudentLearningStepId, StudentLearningStepStatus>;
  onNavigate: (step: StudentLearningStepId) => void;
};

const STEPS: Array<{
  id: StudentLearningStepId;
  shortLabel: string;
  label: string;
}> = [
  { id: 1, shortLabel: '선택', label: '분자 선택' },
  { id: 2, shortLabel: '그리기', label: '구조 만들기' },
  { id: 3, shortLabel: '분석', label: '구조 분석' },
  { id: 4, shortLabel: '3D', label: '3D 비교' },
  { id: 5, shortLabel: '기록', label: '생각 정리·제출' },
];

function formatStatus(status: StudentLearningStepStatus): string {
  switch (status) {
    case 'completed':
      return '완료';
    case 'current':
      return '진행 중';
    case 'review':
      return '검토 필요';
    case 'error':
      return '오류';
    case 'not-started':
      return '시작 전';
  }
}

export function StudentLearningProgress({
  activeStep,
  statuses,
  onNavigate,
}: StudentLearningProgressProps) {
  return (
    <>
      <nav
        className="learning-progress-rail"
        data-testid="learning-progress-rail"
        aria-label="오늘의 탐구 5단계"
      >
        <div className="learning-progress-summary">
          <div>
            <p className="section-label">오늘의 탐구 흐름</p>
            <h2>
              {activeStep} / {STEPS.length} {STEPS[activeStep - 1].label}
            </h2>
          </div>
          <p>단계 잠금 없이 이동할 수 있습니다. 완료 표시는 실제 활동 상태를 반영합니다.</p>
        </div>
        <ol className="learning-step-list">
          {STEPS.map((step) => {
            const status = statuses[step.id];
            const isActive = step.id === activeStep;

            return (
              <li
                className={`learning-step ${status} ${isActive ? 'current' : ''}`}
                key={step.id}
              >
                <button
                  className="learning-step-button"
                  data-testid={`learning-step-${step.id}`}
                  data-status={status}
                  type="button"
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => {
                    onNavigate(step.id);
                  }}
                >
                  <span className="learning-step-index" aria-hidden="true">
                    {status === 'completed' ? '✓' : step.id}
                  </span>
                  <span className="learning-step-label">{step.label}</span>
                  <span className="learning-step-state">
                    {formatStatus(status)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <nav
        className="student-mobile-step-nav"
        data-testid="student-mobile-step-nav"
        aria-label="모바일 탐구 단계"
      >
        {STEPS.map((step) => {
          const status = statuses[step.id];
          const isActive = step.id === activeStep;

          return (
            <button
              className={`${status} ${isActive ? 'current' : ''}`}
              data-testid={`mobile-learning-step-${step.id}`}
              data-status={status}
              key={step.id}
              type="button"
              aria-current={isActive ? 'step' : undefined}
              aria-label={`${step.id}단계 ${step.label}, ${formatStatus(status)}`}
              onClick={() => {
                onNavigate(step.id);
              }}
            >
              <span aria-hidden="true">{status === 'completed' ? '✓' : step.id}</span>
              <small>{step.shortLabel}</small>
            </button>
          );
        })}
      </nav>
    </>
  );
}
