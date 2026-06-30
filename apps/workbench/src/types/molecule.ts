export type MoleculeSource = 'ketcher' | 'example' | 'import';

export type MoleculeValidationStatus =
  | 'unvalidated'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'error';

export type MoleculeValidationSource = 'smiles' | 'mol-block';

export type MoleculeInput = {
  source: MoleculeSource;
  validationStatus: MoleculeValidationStatus;
  label?: string;
  smiles?: string;
  molBlock?: string;
};

export type Molecule3DCoordinateFormat = 'mol' | 'sdf' | 'xyz' | 'pdb';

export type Molecule3DSourceType =
  | 'static-example'
  | 'pubchem'
  | 'user-import'
  | 'review-needed';

export type Molecule3DInput = {
  format: Molecule3DCoordinateFormat;
  data: string;
  label: string;
  sourceType: Molecule3DSourceType;
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
  source: 'pubchem';
}

// Future service contract only. Do not implement automatic PubChem matching until
// user confirmation and candidate review gates are designed in the UI.
export type SearchPubChemCandidatesByCanonicalSmiles = (
  canonicalSmiles: string,
) => Promise<PubChemCandidate[]>;

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
