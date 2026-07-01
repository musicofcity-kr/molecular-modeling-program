import type { MoleculeValidationResult } from './molecule';
import type { ActivityComparisonModeConfig } from './structureComparison';
import type { UserRole } from './session';

export type AppMode = 'free_draw' | 'activity';
export type UserMode = UserRole;

export interface ActivityQuestion {
  id: string;
  label: string;
  placeholder?: string;
}

export interface ActivityTemplate {
  id: string;
  title: string;
  targetMoleculeName: string;
  targetSmiles?: string;
  learningGoal: string;
  prompt: string;
  predictionQuestions: ActivityQuestion[];
  reflectionQuestions: ActivityQuestion[];
  coreConcepts?: string[];
  teacherNotes?: string[];
  misconceptionChecks?: string[];
  requiresVsepr?: boolean;
  comparisonMode?: ActivityComparisonModeConfig;
  expectedVsepr?: {
    axeNotation?: string;
    molecularShapeKo?: string;
    centralAtom?: string;
    lonePairCount?: number;
  };
  recommendedExampleId?: string;
}

export type ActivityResponseState = Record<string, string>;

export type ActivityComparisonStatus =
  | 'not_validated'
  | 'not_answered'
  | 'match'
  | 'different';

export type ActivityComparisonResult = {
  formulaStatus: ActivityComparisonStatus;
  molecularWeightStatus: ActivityComparisonStatus;
  rdkitFormula?: string;
  rdkitMolecularWeight?: string;
};

export function shouldShowVseprModule(options: {
  appMode: AppMode;
  isModuleOpen: boolean;
  selectedTemplate?: ActivityTemplate | null;
}): boolean {
  if (options.appMode === 'activity') {
    return options.selectedTemplate?.requiresVsepr === true;
  }

  return options.isModuleOpen;
}

export function buildActivityComparisonResult(
  responses: ActivityResponseState,
  validationResult: MoleculeValidationResult | null,
): ActivityComparisonResult {
  if (validationResult?.ok !== true) {
    return {
      formulaStatus: 'not_validated',
      molecularWeightStatus: 'not_validated',
    };
  }

  const predictedFormula = responses.predictedFormula?.trim() ?? '';
  const predictedMolecularWeight = responses.predictedMolecularWeight?.trim() ?? '';
  const rdkitMolecularWeight = validationResult.molecularWeight.toFixed(3);

  return {
    formulaStatus: compareText(predictedFormula, validationResult.molecularFormula),
    molecularWeightStatus: compareText(
      predictedMolecularWeight,
      rdkitMolecularWeight,
    ),
    rdkitFormula: validationResult.molecularFormula,
    rdkitMolecularWeight,
  };
}

function compareText(
  studentValue: string,
  rdkitValue: string,
): Exclude<ActivityComparisonStatus, 'not_validated'> {
  if (!studentValue) {
    return 'not_answered';
  }

  return studentValue === rdkitValue ? 'match' : 'different';
}
