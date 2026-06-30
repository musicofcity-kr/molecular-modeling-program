export type VseprStatus =
  | 'not_requested'
  | 'needs_central_atom'
  | 'supported'
  | 'unsupported'
  | 'error';

export type VseprConfidence = 'high' | 'medium' | 'low';

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

export interface VseprTemplateGeometry {
  axeNotation: string;
  vectors: Array<{
    x: number;
    y: number;
    z: number;
    kind: 'bond' | 'lonePair';
  }>;
}
