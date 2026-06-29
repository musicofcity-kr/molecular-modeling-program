export type ExtractedStructureData = {
  source: 'ketcher';
  smiles: string;
  molfile: string;
  extractedAt: string;
  validationStatus: 'rdkit-not-run';
};

export type ChemicalEditorHandle = {
  getSmiles(): Promise<string>;
  getMolfile(): Promise<string>;
  extractStructure(): Promise<ExtractedStructureData>;
  setMolecule(input: { smiles?: string; molfile?: string }): Promise<void>;
  clear(): Promise<void>;
};
