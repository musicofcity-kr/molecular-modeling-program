export type VseprStatus =
  | 'not_requested'
  | 'needs_central_atom'
  | 'supported'
  | 'unsupported'
  | 'error';

export type VseprConfidence = 'high' | 'medium' | 'low';

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
  centralAtomId?: string;
  centralAtomSymbol?: string;
  centralAtomCandidates?: VseprCentralAtomCandidate[];
  bondedAtomCount?: number;
  lonePairCount?: number;
  stericNumber?: number;
  axeNotation?: string;
  electronDomainGeometryKo?: string;
  molecularShapeKo?: string;
  idealBondAngles?: string[];
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
