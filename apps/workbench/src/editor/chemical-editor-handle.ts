import type { MoleculeInput } from '../types/molecule';

export type ExtractedStructureData = {
  source: 'ketcher';
  smiles: string;
  molBlock: string;
  molfile: string;
  extractedAt: string;
  validationStatus: 'unvalidated';
};

export type ChemicalEditorHandle = {
  getSmiles(): Promise<string>;
  getMolfile(): Promise<string>;
  extractStructure(): Promise<ExtractedStructureData>;
  setMolecule(input: Pick<MoleculeInput, 'smiles' | 'molBlock' | 'molfile'>): Promise<void>;
  clear(): Promise<void>;
};
