import { exampleMolecules } from '../data/exampleMolecules';

export type MoleculeExample = {
  id: string;
  labelKo: string;
  smiles: string;
  expectedFormula: string;
};

export const moleculeExamples: MoleculeExample[] = exampleMolecules.map((example) => ({
  id: example.id,
  labelKo: example.nameKo,
  smiles: example.smiles,
  expectedFormula: example.expectedFormula,
}));
