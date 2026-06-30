import type { AppMode, UserMode } from './activity';

export interface ActivityResultSnapshot {
  id: string;
  createdAt: string;
  updatedAt: string;
  appMode: AppMode;
  userMode: UserMode;
  appVersion?: string;
  activityId?: string;
  activityTitle?: string;
  moleculeName?: string;
  studentPrediction: {
    predictedFormula?: string;
    predictedMolecularWeight?: string;
    drawingReason?: string;
  };
  rdkitValidation: {
    isValid: boolean;
    canonicalSmiles?: string;
    molecularFormula?: string;
    molecularWeight?: number;
    studentMessage?: string;
  };
  threeDObservation: {
    has3DStructure: boolean;
    sourceLabel?: string;
    sourceNote?: string;
    studentObservation?: string;
  };
  measurements: ActivityResultMeasurement[];
  vseprResult?: {
    available: boolean;
    axeNotation?: string;
    electronGeometryKo?: string;
    molecularGeometryKo?: string;
    idealBondAngle?: string;
    confidence?: string;
    studentNote?: string;
  };
  comparisonObservation?: {
    available: boolean;
    observedSimilarities?: string;
    observedDifferences?: string;
    studentReflection?: string;
  };
  activityAnswers: ActivityResultAnswer[];
  finalReflection?: string;
  exportNotice: string;
}

export interface ActivityResultMeasurement {
  type: 'bond_length' | 'bond_angle';
  label: string;
  value: number;
  unit: 'angstrom' | 'degree';
  sourceNote: string;
}

export interface ActivityResultAnswer {
  questionId: string;
  questionText: string;
  answer: string;
}
