import { useState, type ReactNode } from 'react';
import type { ExampleMolecule } from '../../data/exampleMolecules';
import type { ActivityTemplate } from '../../types/activity';
import type { Molecule3DInput, MoleculeValidationResult } from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import { ActivityPicker } from './ActivityPicker';
import { CollapsibleStudentStep } from './CollapsibleStudentStep';
import { MoleculeDrawingStep } from './MoleculeDrawingStep';
import { ShapeViewerSection } from './ShapeViewerSection';
import {
  StudentLearningProgress,
  type StudentLearningStepId,
  type StudentLearningStepStatus,
} from './StudentLearningProgress';
import { StudentThoughtSubmission } from './StudentThoughtSubmission';
import { ValidationResultCards } from './ValidationResultCards';

type StudentActivityShellProps = {
  templates: ActivityTemplate[];
  selectedActivityId: string;
  validationResult: MoleculeValidationResult | null;
  vseprAnalysis: VseprAnalysis;
  molecule3DInput: Molecule3DInput | null;
  examples: ExampleMolecule[];
  selectedExampleId: string;
  drawingSlot: ReactNode;
  analysisSlot?: ReactNode | ((open3DComparison: () => void) => ReactNode);
  predictionViewerSlot: ReactNode;
  actual3DViewerSlot: ReactNode;
  external3DSearchSlot?: ReactNode;
  feedbackSlot?: ReactNode;
  thoughtValue: string;
  submissionStatusMessage?: string;
  isThoughtSubmitted: boolean;
  hasVisitedCurrent3DStep: boolean;
  canSubmitThought: boolean;
  isSubmittingThought: boolean;
  thoughtSubmissionAvailabilityMessage: string;
  isAnalyzingStructure?: boolean;
  structureAnalysisErrorMessage?: string;
  onSelectActivity: (activityId: string) => void;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void | Promise<void>;
  onClearStructure?: () => void | Promise<void>;
  onConfirmStructure: () => boolean | Promise<boolean>;
  onVisitCurrent3DStep: () => void;
  onThoughtChange: (value: string) => void;
  onSubmitThought: () => void;
};

export async function confirmStudentStructureAndAdvance(
  onConfirmStructure: () => boolean | Promise<boolean>,
  advanceToAnalysis: () => void,
): Promise<boolean> {
  const didCompleteAnalysis = await onConfirmStructure();

  if (didCompleteAnalysis) {
    advanceToAnalysis();
  }

  return didCompleteAnalysis;
}

export function StudentActivityShell({
  templates,
  selectedActivityId,
  validationResult,
  vseprAnalysis,
  molecule3DInput,
  examples,
  selectedExampleId,
  drawingSlot,
  analysisSlot,
  predictionViewerSlot,
  actual3DViewerSlot,
  external3DSearchSlot,
  feedbackSlot,
  thoughtValue,
  submissionStatusMessage,
  isThoughtSubmitted,
  hasVisitedCurrent3DStep,
  canSubmitThought,
  isSubmittingThought,
  thoughtSubmissionAvailabilityMessage,
  isAnalyzingStructure = false,
  structureAnalysisErrorMessage,
  onSelectActivity,
  onSelectExample,
  onLoadExample,
  onClearStructure,
  onConfirmStructure,
  onVisitCurrent3DStep,
  onThoughtChange,
  onSubmitThought,
}: StudentActivityShellProps) {
  const [activeStep, setActiveStep] = useState<StudentLearningStepId>(1);

  const baseStatuses: Record<StudentLearningStepId, StudentLearningStepStatus> = {
    1: 'completed',
    2: validationResult ? 'completed' : 'not-started',
    3:
      validationResult?.ok === true
        ? 'completed'
        : validationResult
          ? 'error'
          : 'not-started',
    4:
      validationResult?.ok === true &&
      vseprAnalysis.status === 'supported' &&
      molecule3DInput?.coordinateDimension === '3d' &&
      hasVisitedCurrent3DStep
        ? 'completed'
        : validationResult?.ok === true
          ? 'review'
          : 'not-started',
    5: isThoughtSubmitted
      ? 'completed'
      : thoughtValue.trim()
        ? 'review'
        : 'not-started',
  };
  const statuses = {
    ...baseStatuses,
    [activeStep]:
      baseStatuses[activeStep] === 'not-started'
        ? 'current'
        : baseStatuses[activeStep],
  };

  const navigateToStep = (step: StudentLearningStepId) => {
    setActiveStep(step);

    if (
      step === 4 &&
      validationResult?.ok === true &&
      vseprAnalysis.status === 'supported' &&
      molecule3DInput?.coordinateDimension === '3d'
    ) {
      onVisitCurrent3DStep();
    }

    if (typeof document === 'undefined') {
      return;
    }

    window.setTimeout(() => {
      const target = document.getElementById(`student-step-${step}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      target?.focus({ preventScroll: true });
    }, 0);
  };

  if (templates.length === 0) {
    return null;
  }

  return (
    <div
      className="student-activity-shell direct-workbench"
      data-testid="student-activity-shell"
      data-active-step={activeStep}
      data-validation-status={
        validationResult?.ok === true
          ? 'valid'
          : validationResult
            ? 'invalid'
            : 'not_requested'
      }
    >
      <StudentLearningProgress
        activeStep={activeStep}
        statuses={statuses}
        onNavigate={navigateToStep}
      />
      <ActivityPicker
        templates={templates}
        selectedActivityId={selectedActivityId}
        onSelectActivity={(activityId) => {
          onSelectActivity(activityId);
          navigateToStep(2);
        }}
        collapsible={false}
      />
      <MoleculeDrawingStep
        examples={examples}
        selectedExampleId={selectedExampleId}
        drawingSlot={drawingSlot}
        onSelectExample={onSelectExample}
        onLoadExample={onLoadExample}
        onClearStructure={onClearStructure}
        isAnalyzing={isAnalyzingStructure}
        analysisErrorMessage={structureAnalysisErrorMessage}
        onConfirmStructure={() => {
          void confirmStudentStructureAndAdvance(onConfirmStructure, () => {
            navigateToStep(3);
          });
        }}
        collapsible={false}
      />
      <section className="student-analysis-stage" data-testid="student-analysis-stage">
        <ValidationResultCards
          validationResult={validationResult}
          vseprAnalysis={vseprAnalysis}
          molecule3DInput={molecule3DInput}
          collapsible={false}
        />
        {typeof analysisSlot === 'function'
          ? analysisSlot(() => {
              navigateToStep(4);
            })
          : analysisSlot}
      </section>
      <ShapeViewerSection
        predictionSlot={predictionViewerSlot}
        actual3DSlot={actual3DViewerSlot}
        external3DSearchSlot={external3DSearchSlot}
        comparisonSlot={null}
        collapsible={false}
      />
      <CollapsibleStudentStep
        id="student-step-5"
        className="student-step student-reflection-step"
        testId="student-reflection-step"
        sectionLabel="생각 정리·제출"
        title="비교한 내용을 근거로 나의 판단을 정리합니다"
        collapsible={false}
      >
        <div className="student-reflection-grid">
          <StudentThoughtSubmission
            value={thoughtValue}
            statusMessage={submissionStatusMessage}
            canSubmit={canSubmitThought}
            isSubmitting={isSubmittingThought}
            availabilityMessage={thoughtSubmissionAvailabilityMessage}
            onChange={onThoughtChange}
            onSubmit={onSubmitThought}
          />
          {feedbackSlot}
        </div>
      </CollapsibleStudentStep>
    </div>
  );
}
