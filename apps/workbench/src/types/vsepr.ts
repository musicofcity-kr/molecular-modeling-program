export type VseprStatus =
  | 'not_requested'
  | 'needs_central_atom'
  | 'supported'
  | 'unsupported'
  | 'error';

export type VseprConfidence = 'high' | 'medium' | 'low';
export type VseprAnalysisScope = 'local-center';

export interface CuratedReferenceAngle {
  value: number;
  unit: 'degree';
  sourceLabel: string;
}

export interface GeometryAngleEvidence {
  vseprIdealAngles: string[];
  generatedCoordinateMeasurements?: number[];
  curatedReferenceAngles?: CuratedReferenceAngle[];
}

export type VseprModelViewStatus =
  | 'not_requested'
  | 'ready'
  | 'rendered'
  | 'unsupported'
  | 'error';

export interface VseprCentralAtomCandidate {
  atomId: string;
  atomSymbol: string;
  atomLabel: string;
  bondedAtomCount: number;
  explicitBondedAtomCount: number;
  inferredHydrogenCount: number;
}

export interface VseprAnalysis {
  status: VseprStatus;
  scope?: VseprAnalysisScope;
  centralAtomId?: string;
  centralAtomSymbol?: string;
  centralAtomLabel?: string;
  centralAtomCandidates?: VseprCentralAtomCandidate[];
  bondedAtomCount?: number;
  lonePairCount?: number;
  stericNumber?: number;
  axeNotation?: string;
  electronDomainGeometryKo?: string;
  molecularShapeKo?: string;
  idealBondAngles?: string[];
  angleEvidence?: GeometryAngleEvidence;
  confidence: VseprConfidence;
  warnings: string[];
  studentMessage?: string;
  developerLogs?: string[];
}

export interface VseprVector {
  x: number;
  y: number;
  z: number;
  kind: 'bond' | 'lonePair';
  label?: string;
}

export interface VseprGeometryTemplate {
  axeNotation: string;
  electronDomainGeometryKo: string;
  molecularShapeKo: string;
  idealBondAngles: string[];
  vectors: VseprVector[];
  note: string;
}
