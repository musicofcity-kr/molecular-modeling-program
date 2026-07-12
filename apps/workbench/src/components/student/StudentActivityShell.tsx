import type { ReactNode } from 'react';
import type { ExampleMolecule } from '../../data/exampleMolecules';
import type { ActivityTemplate } from '../../types/activity';
import type { Molecule3DInput, MoleculeValidationResult } from '../../types/molecule';
import type { VseprAnalysis } from '../../types/vsepr';
import { ActivityPicker } from './ActivityPicker';
import { MoleculeDrawingStep } from './MoleculeDrawingStep';
import { ShapeViewerSection } from './ShapeViewerSection';
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
  predictionViewerSlot: ReactNode;
  actual3DViewerSlot: ReactNode;
  external3DSearchSlot?: ReactNode;
  thoughtValue: string;
  submissionStatusMessage?: string;
  canSubmitThought: boolean;
  isSubmittingThought: boolean;
  thoughtSubmissionAvailabilityMessage: string;
  onSelectActivity: (activityId: string) => void;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void;
  onConfirmStructure: () => boolean | Promise<boolean>;
  onThoughtChange: (value: string) => void;
  onSubmitThought: () => void;
};

export function StudentActivityShell({
  templates,
  selectedActivityId,
  validationResult,
  vseprAnalysis,
  molecule3DInput,
  examples,
  selectedExampleId,
  drawingSlot,
  predictionViewerSlot,
  actual3DViewerSlot,
  external3DSearchSlot,
  thoughtValue,
  submissionStatusMessage,
  canSubmitThought,
  isSubmittingThought,
  thoughtSubmissionAvailabilityMessage,
  onSelectActivity,
  onSelectExample,
  onLoadExample,
  onConfirmStructure,
  onThoughtChange,
  onSubmitThought,
}: StudentActivityShellProps) {
  if (templates.length === 0) {
    return null;
  }

  return (
    <div
      className="student-activity-shell direct-workbench"
      data-testid="student-activity-shell"
      data-validation-status={
        validationResult?.ok === true
          ? 'valid'
          : validationResult
            ? 'invalid'
            : 'not_requested'
      }
    >
      <ActivityPicker
        templates={templates}
        selectedActivityId={selectedActivityId}
        onSelectActivity={onSelectActivity}
        collapsible={false}
      />
      <MoleculeDrawingStep
        examples={examples}
        selectedExampleId={selectedExampleId}
        drawingSlot={drawingSlot}
        onSelectExample={onSelectExample}
        onLoadExample={onLoadExample}
        onConfirmStructure={() => {
          void onConfirmStructure();
        }}
        collapsible={false}
      />
      <ValidationResultCards
        validationResult={validationResult}
        vseprAnalysis={vseprAnalysis}
        molecule3DInput={molecule3DInput}
        collapsible={false}
      />
      <ShapeViewerSection
        predictionSlot={predictionViewerSlot}
        thoughtSubmissionSlot={
          <StudentThoughtSubmission
            value={thoughtValue}
            statusMessage={submissionStatusMessage}
            canSubmit={canSubmitThought}
            isSubmitting={isSubmittingThought}
            availabilityMessage={thoughtSubmissionAvailabilityMessage}
            onChange={onThoughtChange}
            onSubmit={onSubmitThought}
          />
        }
        actual3DSlot={actual3DViewerSlot}
        external3DSearchSlot={external3DSearchSlot}
        comparisonSlot={null}
        collapsible={false}
      />
    </div>
  );
}
