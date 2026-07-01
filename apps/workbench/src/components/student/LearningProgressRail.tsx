export type LearningStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type LearningStep = {
  id: LearningStepId;
  label: string;
  phase: 'predict' | 'build' | 'verify' | 'reflect';
  phaseLabel: string;
  targetId: string;
};

type LearningProgressRailProps = {
  currentStep: LearningStepId;
};

const STEPS: LearningStep[] = [
  { id: 1, label: '활동 선택', phase: 'predict', phaseLabel: '예측', targetId: 'student-step-1' },
  { id: 2, label: '예측 입력', phase: 'predict', phaseLabel: '예측', targetId: 'student-step-2' },
  { id: 3, label: '구조 그리기', phase: 'build', phaseLabel: '구축', targetId: 'student-step-3' },
  { id: 4, label: '구조 확인', phase: 'verify', phaseLabel: '검증', targetId: 'student-step-4' },
  { id: 5, label: '입체 구조 보기', phase: 'verify', phaseLabel: '검증', targetId: 'student-step-5' },
  { id: 6, label: '비교 기록', phase: 'reflect', phaseLabel: '성찰', targetId: 'student-step-6' },
  { id: 7, label: '결과 정리', phase: 'reflect', phaseLabel: '성찰', targetId: 'student-step-7' },
];

const PHASES = [
  { id: 'predict', label: '예측', range: '01-02' },
  { id: 'build', label: '구축', range: '03' },
  { id: 'verify', label: '검증', range: '04-05' },
  { id: 'reflect', label: '성찰', range: '06-07' },
] as const;

export function LearningProgressRail({ currentStep }: LearningProgressRailProps) {
  const current = STEPS.find((step) => step.id === currentStep) ?? STEPS[2];
  const handleMoveToStep = (targetId: string) => {
    const target = document.getElementById(targetId);

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  };

  return (
    <section className="learning-progress-rail" aria-label="수업 활동 진행 단계">
      <div className="learning-progress-summary">
        <div>
          <p className="section-label">오늘의 탐구 흐름</p>
          <h2>
            지금: {current.phaseLabel} 단계 · {current.label}
          </h2>
        </div>
        <p>구조를 먼저 만들고, 확인을 통과한 값만 결과로 봅니다.</p>
      </div>

      <div className="learning-phase-legend" aria-label="단계 유형">
        {PHASES.map((phase) => (
          <span className={`learning-phase-chip ${phase.id}`} key={phase.id}>
            {phase.label} · {phase.range}
          </span>
        ))}
      </div>

      <ol className="learning-step-list">
        {STEPS.map((step) => (
          <li
            className={[
              'learning-step',
              step.phase,
              step.id === currentStep ? 'active' : '',
              step.id < currentStep ? 'completed' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={step.id}
            aria-current={step.id === currentStep ? 'step' : undefined}
          >
            <button
              className="learning-step-button"
              type="button"
              aria-label={`${String(step.id).padStart(2, '0')} ${step.label} 단계로 이동`}
              onClick={() => {
                handleMoveToStep(step.targetId);
              }}
            >
              <span className="learning-step-index">{String(step.id).padStart(2, '0')}</span>
              <span className="learning-step-label">{step.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
