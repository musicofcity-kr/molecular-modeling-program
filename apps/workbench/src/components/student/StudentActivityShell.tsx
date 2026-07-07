import { useState, type ReactNode } from 'react';
import type { ExampleMolecule } from '../../data/exampleMolecules';
import type {
  ActivityResponseState,
  ActivityTemplate,
} from '../../types/activity';
import type { Molecule3DInput, MoleculeValidationResult } from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import { ActivityPicker } from './ActivityPicker';
import { MoleculeDrawingStep } from './MoleculeDrawingStep';
import { PredictionStep } from './PredictionStep';
import { ReflectionStep } from './ReflectionStep';
import { ShapeViewerSection } from './ShapeViewerSection';
import { ValidationResultCards } from './ValidationResultCards';
import {
  LEARNING_STEPS,
  type LearningStepId,
} from './LearningProgressRail';

type StudentActivityShellProps = {
  templates: ActivityTemplate[];
  selectedActivityId: string;
  responses: ActivityResponseState;
  validationResult: MoleculeValidationResult | null;
  vseprAnalysis: VseprAnalysis;
  molecule3DInput: Molecule3DInput | null;
  examples: ExampleMolecule[];
  selectedExampleId: string;
  drawingSlot: ReactNode;
  predictionViewerSlot: ReactNode;
  actual3DViewerSlot: ReactNode;
  external3DSearchSlot?: ReactNode;
  comparisonSlot: ReactNode;
  resultSlot: ReactNode;
  currentStep: LearningStepId;
  onSelectActivity: (activityId: string) => void;
  onResponseChange: (questionId: string, value: string) => void;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void;
  onConfirmStructure: () => boolean | Promise<boolean>;
  onStepChange: (step: LearningStepId) => void;
};

export function StudentActivityShell({
  templates,
  selectedActivityId,
  responses,
  validationResult,
  vseprAnalysis,
  molecule3DInput,
  examples,
  selectedExampleId,
  drawingSlot,
  predictionViewerSlot,
  actual3DViewerSlot,
  external3DSearchSlot,
  comparisonSlot,
  resultSlot,
  currentStep,
  onSelectActivity,
  onResponseChange,
  onSelectExample,
  onLoadExample,
  onConfirmStructure,
  onStepChange,
}: StudentActivityShellProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const selectedTemplate =
    templates.find((template) => template.id === selectedActivityId) ?? templates[0];

  if (!selectedTemplate) {
    return null;
  }

  const currentStepMeta =
    LEARNING_STEPS.find((step) => step.id === currentStep) ?? LEARNING_STEPS[0];
  const previousStep = currentStep > 1 ? ((currentStep - 1) as LearningStepId) : null;
  const nextStep = currentStep < 7 ? ((currentStep + 1) as LearningStepId) : null;
  const nextStepLabel = nextStep
    ? LEARNING_STEPS.find((step) => step.id === nextStep)?.label
    : null;
  const stageClassName = [
    'student-wizard-stage',
    `phase-${currentStepMeta.phase}`,
    currentStep === 3 ? 'wide' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const confirmStructureAndAdvance = async () => {
    setIsAdvancing(true);
    try {
      const canAdvance = await onConfirmStructure();

      if (canAdvance) {
        onStepChange(4);
      }
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleNext = async () => {
    if (!nextStep) {
      return;
    }

    if (currentStep === 3) {
      await confirmStructureAndAdvance();
      return;
    }

    onStepChange(nextStep);
  };

  const currentStepContent = (() => {
    switch (currentStep) {
      case 1:
        return (
          <ActivityPicker
            templates={templates}
            selectedActivityId={selectedActivityId}
            onSelectActivity={onSelectActivity}
            collapsible={false}
          />
        );
      case 2:
        return (
          <PredictionStep
            questions={selectedTemplate.predictionQuestions}
            responses={responses}
            onResponseChange={onResponseChange}
            collapsible={false}
          />
        );
      case 3:
        return (
          <MoleculeDrawingStep
            examples={examples}
            selectedExampleId={selectedExampleId}
            drawingSlot={drawingSlot}
            onSelectExample={onSelectExample}
            onLoadExample={onLoadExample}
            onConfirmStructure={() => {
              void confirmStructureAndAdvance();
            }}
            collapsible={false}
          />
        );
      case 4:
        return (
          <ValidationResultCards
            responses={responses}
            validationResult={validationResult}
            vseprAnalysis={vseprAnalysis}
            molecule3DInput={molecule3DInput}
            collapsible={false}
          />
        );
      case 5:
        return (
          <ShapeViewerSection
            predictionSlot={predictionViewerSlot}
            actual3DSlot={actual3DViewerSlot}
            external3DSearchSlot={external3DSearchSlot}
            comparisonSlot={null}
            collapsible={false}
          />
        );
      case 6:
        return comparisonSlot;
      case 7:
        return resultSlot;
    }
  })();

  return (
    <div className="student-activity-shell is-wizard" data-testid="student-activity-shell">
      <div
        className={stageClassName}
        data-testid="student-wizard-stage"
        data-current-step={currentStep}
        data-validation-status={
          validationResult?.ok === true
            ? 'valid'
            : validationResult
              ? 'invalid'
              : 'not_requested'
        }
      >
        {currentStepContent}
      </div>

      <nav className="student-wizard-action-bar" aria-label="활동 단계 이동">
        <button
          className="secondary-action"
          data-testid="student-wizard-previous-button"
          type="button"
          disabled={!previousStep}
          onClick={() => {
            if (previousStep) {
              onStepChange(previousStep);
            }
          }}
        >
          ← 이전
        </button>
        {nextStep && nextStepLabel ? (
          <button
            className={`primary-action phase-${currentStepMeta.phase}`}
            data-testid="student-wizard-next-button"
            type="button"
            disabled={isAdvancing}
            onClick={() => {
              void handleNext();
            }}
          >
            {isAdvancing ? '확인 중...' : `다음: ${nextStepLabel} →`}
          </button>
        ) : (
          <span className="status-pill ready">7단계까지 도착했습니다</span>
        )}
      </nav>
    </div>
  );
}
