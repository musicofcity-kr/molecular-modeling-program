export type MoleculeSource = 'ketcher' | 'example' | 'import';

export type MoleculeValidationStatus =
  | 'unvalidated'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'error';

export type MoleculeValidationSource = 'smiles' | 'mol-block';

export type StructureIntent =
  | 'single-molecule'
  | 'ionic-compound'
  | 'mixture';

export type MoleculeGraphSummary = {
  atomCount: number;
  bondCount: number;
  componentCount: number;
  componentAtomCounts: number[];
  isSingleComponent: boolean;
  isolatedAtomCount: number;
};

export type ConnectivityDecision = {
  allowed: boolean;
  status:
    | 'empty'
    | 'single-component'
    | 'multiple-components-allowed'
    | 'multiple-components-blocked';
  intent: StructureIntent;
  summary?: MoleculeGraphSummary;
  warnings?: string[];
  errors?: string[];
};

export type MoleculeInput = {
  source: MoleculeSource;
  validationStatus: MoleculeValidationStatus;
  structureIntent?: StructureIntent;
  label?: string;
  smiles?: string;
  molBlock?: string;
};

export type Molecule3DCoordinateFormat = 'mol' | 'sdf' | 'xyz' | 'pdb';

export type Molecule3DCoordinateDimension = '2d' | '3d' | 'unknown';

export type Molecule3DRepresentationMode =
  | 'ball-and-stick'
  | 'stick'
  | 'space-filling';

export type AtomSelectionMode = 'none' | 'bond_length' | 'bond_angle';

export interface SelectedAtom3D {
  atomIndex: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface GeometryMeasurementResult {
  type: 'bond_length' | 'bond_angle';
  atomIndices: number[];
  atomLabels: string[];
  value: number;
  unit: 'angstrom' | 'degree';
  sourceNote: string;
}

export type Molecule3DSourceType =
  | 'static-example'
  | 'pubchem'
  | 'user-import'
  | 'review-needed';

export type Molecule3DStructureMatchStatus =
  | 'verified'
  | 'formula-compatible'
  | 'review-needed';

export type Molecule3DInput = {
  format: Molecule3DCoordinateFormat;
  data: string;
  label: string;
  sourceType: Molecule3DSourceType;
  coordinateDimension: Molecule3DCoordinateDimension;
  structureMatchStatus?: Molecule3DStructureMatchStatus;
  coordinateSource: string;
  sourceNote?: string;
  sourceUrl?: string;
};

export type PubChemMatchStatus =
  | 'not_requested'
  | 'searching'
  | 'no_match'
  | 'single_candidate'
  | 'multiple_candidates'
  | 'error';

export interface PubChemCandidate {
  cid: number;
  title?: string;
  molecularFormula?: string;
  molecularWeight?: string;
  canonicalSmiles?: string;
  isomericSmiles?: string;
  source: 'pubchem';
}

export type PubChemCandidateSearchResult =
  | {
      ok: true;
      status: Exclude<PubChemMatchStatus, 'not_requested' | 'searching' | 'error'>;
      candidates: PubChemCandidate[];
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    }
  | {
      ok: false;
      status: 'error';
      candidates: [];
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    };

export type SearchPubChemCandidatesByCanonicalSmiles = (
  canonicalSmiles: string,
) => Promise<PubChemCandidateSearchResult>;

export type MoleculeValidationResult =
  | {
      ok: true;
      validationStatus: 'valid';
      source: MoleculeValidationSource;
      smiles?: string;
      molBlock?: string;
      canonicalSmiles: string;
      molecularFormula: string;
      molecularWeight: number;
      structureIntent?: StructureIntent;
      graphSummary?: MoleculeGraphSummary;
      connectivityDecision?: ConnectivityDecision;
      studentMessage?: never;
      warnings: string[];
      errors: string[];
      developerLogs: string[];
    }
  | {
      ok: false;
      validationStatus: 'invalid' | 'error';
      source?: MoleculeValidationSource;
      smiles?: never;
      molBlock?: never;
      canonicalSmiles?: never;
      molecularFormula?: never;
      molecularWeight?: never;
      structureIntent?: StructureIntent;
      graphSummary?: MoleculeGraphSummary;
      connectivityDecision?: ConnectivityDecision;
      studentMessage: string;
      warnings: string[];
      errors: string[];
      developerLogs: string[];
    };

export type MoleculeRenderState = {
  validationStatus: MoleculeValidationStatus;
  smiles?: string;
  molBlock?: string;
  molecularFormula?: string;
  molecularWeight?: number;
  editor: {
    provider: 'ketcher';
    status: 'not-loaded' | 'loading' | 'ready' | 'error';
    message?: string;
  };
  structure2d: {
    status: 'empty' | 'available' | 'blocked';
    source?: 'ketcher' | 'validated';
  };
  structure3d: {
    provider: '3dmol';
    status: 'not-requested' | 'waiting-for-validation' | 'ready' | 'blocked' | 'error';
    method?: 'generated-conformer' | 'source-coordinates';
    message?: string;
  };
};
