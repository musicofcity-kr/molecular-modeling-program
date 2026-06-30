import type { MoleculeValidationResult } from './molecule';

export type AppMode = 'free_draw' | 'activity';

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
