import type { ReactNode } from 'react';
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
  onSelectActivity: (activityId: string) => void;
  onResponseChange: (questionId: string, value: string) => void;
  onSelectExample: (exampleId: string) => void;
  onLoadExample: () => void;
  onConfirmStructure: () => void;
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
  onSelectActivity,
  onResponseChange,
  onSelectExample,
  onLoadExample,
  onConfirmStructure,
}: StudentActivityShellProps) {
  const selectedTemplate =
    templates.find((template) => template.id === selectedActivityId) ?? templates[0];

  if (!selectedTemplate) {
    return null;
  }

  return (
    <div className="student-activity-shell" data-testid="student-activity-shell">
      <ActivityPicker
        templates={templates}
        selectedActivityId={selectedActivityId}
        onSelectActivity={onSelectActivity}
      />
      <PredictionStep
        questions={selectedTemplate.predictionQuestions}
        responses={responses}
        onResponseChange={onResponseChange}
      />
      <MoleculeDrawingStep
        examples={examples}
        selectedExampleId={selectedExampleId}
        drawingSlot={drawingSlot}
        onSelectExample={onSelectExample}
        onLoadExample={onLoadExample}
        onConfirmStructure={onConfirmStructure}
      />
      <ValidationResultCards
        validationResult={validationResult}
        vseprAnalysis={vseprAnalysis}
        molecule3DInput={molecule3DInput}
      />
      <ShapeViewerSection
        predictionSlot={predictionViewerSlot}
        actual3DSlot={actual3DViewerSlot}
        external3DSearchSlot={external3DSearchSlot}
        comparisonSlot={comparisonSlot}
      />
      <ReflectionStep
        questions={selectedTemplate.reflectionQuestions}
        responses={responses}
        onResponseChange={onResponseChange}
      />
      {resultSlot}
    </div>
  );
}
