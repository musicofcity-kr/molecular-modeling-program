import { useEffect, useRef, useState } from 'react';

export type LearningStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type LearningStep = {
  id: LearningStepId;
  label: string;
  phase: 'predict' | 'build' | 'verify' | 'reflect';
  phaseLabel: string;
  elementSymbol: 'Li' | 'Cu' | 'Na' | 'K';
};

type LearningProgressRailProps = {
  currentStep: LearningStepId;
  onStepSelect?: (step: LearningStepId) => void;
};

export const LEARNING_STEPS: LearningStep[] = [
  { id: 1, label: '활동 선택', phase: 'predict', phaseLabel: '예측', elementSymbol: 'Li' },
  { id: 2, label: '예측 입력', phase: 'predict', phaseLabel: '예측', elementSymbol: 'Li' },
  { id: 3, label: '구조 그리기', phase: 'build', phaseLabel: '구축', elementSymbol: 'Cu' },
  { id: 4, label: '구조 확인', phase: 'verify', phaseLabel: '검증', elementSymbol: 'Na' },
  { id: 5, label: '입체 구조 보기', phase: 'verify', phaseLabel: '검증', elementSymbol: 'Na' },
  { id: 6, label: '비교 기록', phase: 'reflect', phaseLabel: '성찰', elementSymbol: 'K' },
  { id: 7, label: '결과 정리', phase: 'reflect', phaseLabel: '성찰', elementSymbol: 'K' },
];

const PHASES = [
  { id: 'predict', label: '예측', range: '01-02' },
  { id: 'build', label: '구축', range: '03' },
  { id: 'verify', label: '검증', range: '04-05' },
  { id: 'reflect', label: '성찰', range: '06-07' },
] as const;

function getStepState(
  stepId: LearningStepId,
  currentStep: LearningStepId,
): 'completed' | 'current' | 'future' {
  if (stepId < currentStep) {
    return 'completed';
  }

  if (stepId === currentStep) {
    return 'current';
  }

  return 'future';
}

function getStepStateLabel(state: 'completed' | 'current' | 'future'): string {
  switch (state) {
    case 'completed':
      return '완료';
    case 'current':
      return '현재';
    case 'future':
      return '예정';
  }
}

export function LearningProgressRail({
  currentStep,
  onStepSelect,
}: LearningProgressRailProps) {
  const current =
    LEARNING_STEPS.find((step) => step.id === currentStep) ?? LEARNING_STEPS[2];
  const previousStepRef = useRef<LearningStepId>(currentStep);
  const [ignitedStep, setIgnitedStep] = useState<LearningStepId | null>(null);

  useEffect(() => {
    if (currentStep > previousStepRef.current) {
      setIgnitedStep((currentStep - 1) as LearningStepId);
      const timeout = window.setTimeout(() => {
        setIgnitedStep(null);
      }, 420);
      previousStepRef.current = currentStep;

      return () => {
        window.clearTimeout(timeout);
      };
    }

    previousStepRef.current = currentStep;
    return undefined;
  }, [currentStep]);

  const moveFocus = (currentButton: HTMLButtonElement, direction: -1 | 1) => {
    const list = currentButton.closest('.learning-step-list');

    if (!list) {
      return;
    }

    const buttons = Array.from(
      list.querySelectorAll<HTMLButtonElement>('.learning-step-button'),
    );
    const currentIndex = buttons.indexOf(currentButton);
    const nextButton = buttons[currentIndex + direction];

    nextButton?.focus();
  };

  const handleSelectStep = (step: LearningStep) => {
    if (step.id > currentStep) {
      return;
    }

    onStepSelect?.(step.id);
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

      <div className="learning-progress-mobile" aria-label="현재 활동 단계">
        <span className={`learning-mobile-node ${current.phase}`}>
          {current.elementSymbol}
        </span>
        <strong>
          {current.phaseLabel} {current.id}/7
        </strong>
        <span>{current.label}</span>
        <span className="learning-mobile-progress" aria-hidden="true">
          <span style={{ width: `${(current.id / LEARNING_STEPS.length) * 100}%` }} />
        </span>
      </div>

      <ol className="learning-step-list">
        {LEARNING_STEPS.map((step) => {
          const state = getStepState(step.id, currentStep);
          const stateLabel = getStepStateLabel(state);

          return (
            <li
              className={[
                'learning-step',
                step.phase,
                state,
                ignitedStep === step.id ? 'just-ignited' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={step.id}
              data-step-state={state}
              aria-current={state === 'current' ? 'step' : undefined}
            >
              <button
                className="learning-step-button"
                type="button"
                aria-disabled={state === 'future'}
                aria-label={`${String(step.id).padStart(2, '0')} ${step.label} 단계 ${
                  stateLabel
                }`}
                onClick={() => {
                  handleSelectStep(step);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight') {
                    event.preventDefault();
                    moveFocus(event.currentTarget, 1);
                  }

                  if (event.key === 'ArrowLeft') {
                    event.preventDefault();
                    moveFocus(event.currentTarget, -1);
                  }
                }}
              >
                <span className="learning-step-index" aria-hidden="true">
                  <span className="learning-step-symbol">{step.elementSymbol}</span>
                  {state === 'completed' ? (
                    <span className="learning-step-check">✓</span>
                  ) : null}
                </span>
                <span className="learning-step-label">{step.label}</span>
                <span className="learning-step-state">{stateLabel}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
