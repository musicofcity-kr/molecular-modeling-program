export type MoleculeExample = {
  id: string;
  labelKo: string;
  smiles: string;
  expectedFormula: string;
};

export const moleculeExamples: MoleculeExample[] = [
  { id: 'water', labelKo: '물', smiles: 'O', expectedFormula: 'H2O' },
  { id: 'methane', labelKo: '메테인', smiles: 'C', expectedFormula: 'CH4' },
  { id: 'ethanol', labelKo: '에탄올', smiles: 'CCO', expectedFormula: 'C2H6O' },
  { id: 'acetic-acid', labelKo: '아세트산', smiles: 'CC(=O)O', expectedFormula: 'C2H4O2' },
  { id: 'benzene', labelKo: '벤젠', smiles: 'c1ccccc1', expectedFormula: 'C6H6' },
  {
    id: 'glucose',
    labelKo: '포도당',
    smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O',
    expectedFormula: 'C6H12O6',
  },
  {
    id: 'aspirin',
    labelKo: '아스피린',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    expectedFormula: 'C9H8O4',
  },
];
