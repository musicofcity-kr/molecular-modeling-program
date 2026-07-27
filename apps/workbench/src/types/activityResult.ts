import type { AppMode, UserMode } from './activity';
import type {
  ConnectivityDecision,
  MoleculeGraphSummary,
  StructureIntent,
} from './molecule';
import type {
  GeometryAngleEvidence,
  VseprAnalysisScope,
} from './vsepr';

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
    warnings?: string[];
    structureIntent?: StructureIntent;
    graphSummary?: MoleculeGraphSummary;
    connectivityStatus?: ConnectivityDecision['status'];
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
    scope?: VseprAnalysisScope;
    selectedCenter?: {
      atomId: string;
      atomSymbol: string;
      atomLabel: string;
    };
    axeNotation?: string;
    electronGeometryKo?: string;
    molecularGeometryKo?: string;
    idealBondAngle?: string;
    angleEvidence?: GeometryAngleEvidence;
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
  afterValidationReflection?: string;
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
