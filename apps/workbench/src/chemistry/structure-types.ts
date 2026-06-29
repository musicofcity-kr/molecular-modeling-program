export type MoleculeInput = {
  source: 'ketcher' | 'example' | 'import';
  smiles?: string;
  molfile?: string;
  label?: string;
};

export type MoleculeValidationSource = 'smiles' | 'molfile';

export type MoleculeValidationResult = {
  ok: boolean;
  source?: MoleculeValidationSource;
  canonicalSmiles?: string;
  formula?: string;
  molecularWeight?: number;
  warnings: string[];
  errors: string[];
  developerLogs: string[];
};
