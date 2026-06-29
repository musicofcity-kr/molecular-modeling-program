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
  molfile?: string;
};

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
