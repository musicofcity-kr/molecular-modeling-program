export type StructureComparisonAvailability =
  | 'available'
  | 'missing_real_3d'
  | 'missing_vsepr'
  | 'low_confidence_vsepr'
  | 'multi_center_not_recommended'
  | 'rdkit_invalid'
  | 'not_supported';

export interface StructureComparisonState {
  availability: StructureComparisonAvailability;
  real3DSourceLabel: string;
  vseprSourceLabel: string;
  rdkitFormula?: string;
  rdkitCanonicalSmiles?: string;
  real3DStructureAvailable: boolean;
  vseprModelAvailable: boolean;
  warnings: string[];
  studentMessage: string;
  teacherNote?: string;
  recommended: boolean;
}

export interface StructureComparisonObservation {
  moleculeName?: string;
  rdkitFormula?: string;
  real3DSourceLabel: string;
  vseprAxeNotation?: string;
  vseprShapeKo?: string;
  idealBondAngle?: string;
  observedSimilarities: string;
  observedDifferences: string;
  studentReflection: string;
}

export interface ActivityComparisonModeConfig {
  enabled: boolean;
  recommended: boolean;
  focusQuestion: string;
  teacherNote?: string;
}
