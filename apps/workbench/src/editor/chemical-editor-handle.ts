import type { MoleculeInput } from '../types/molecule';

export type ExtractedStructureData = MoleculeInput & {
  source: 'ketcher';
  smiles: string;
  molBlock: string;
  extractedAt: string;
  validationStatus: 'unvalidated';
};

export type ChemicalEditorHandle = {
  getSmiles(): Promise<string>;
  getMolfile(): Promise<string>;
  extractStructure(): Promise<ExtractedStructureData>;
  setMolecule(input: Pick<MoleculeInput, 'smiles' | 'molBlock'>): Promise<void>;
  clear(): Promise<void>;
};
