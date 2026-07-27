# Molecule and Graph Fixtures

```json
[
  {
    "id": "water",
    "labelKo": "물",
    "smiles": "O",
    "intent": "single-molecule",
    "expected": { "componentCount": 1 }
  },
  {
    "id": "methane",
    "labelKo": "메테인",
    "smiles": "C",
    "intent": "single-molecule",
    "expected": { "componentCount": 1 }
  },
  {
    "id": "ethanol",
    "labelKo": "에탄올",
    "smiles": "CCO",
    "intent": "single-molecule",
    "expected": { "atomCount": 3, "bondCount": 2, "componentCount": 1 }
  },
  {
    "id": "butane",
    "labelKo": "부탄",
    "smiles": "CCCC",
    "intent": "single-molecule",
    "expected": { "atomCount": 4, "bondCount": 3, "componentCount": 1 }
  },
  {
    "id": "isobutane",
    "labelKo": "아이소부탄",
    "smiles": "CC(C)C",
    "intent": "single-molecule",
    "expected": { "atomCount": 4, "bondCount": 3, "componentCount": 1 }
  },
  {
    "id": "acetic-acid",
    "labelKo": "아세트산",
    "smiles": "CC(=O)O",
    "intent": "single-molecule",
    "expected": { "componentCount": 1 }
  },
  {
    "id": "benzene",
    "labelKo": "벤젠",
    "smiles": "c1ccccc1",
    "intent": "single-molecule",
    "expected": { "atomCount": 6, "bondCount": 6, "componentCount": 1 }
  },
  {
    "id": "aspirin",
    "labelKo": "아스피린",
    "smiles": "CC(=O)Oc1ccccc1C(=O)O",
    "intent": "single-molecule",
    "expected": { "componentCount": 1 }
  }
]
```

## Required non-SMILES graph fixtures

Create tested Molfile or explicit atom/bond graph fixtures for:

- four carbon atoms with zero bonds: A=4, B=0, C=4
- two connected carbons plus two isolated carbons: A=4, B=1, C=3
- ionic pair with explicit charges: C>1 and intent-dependent decision
- mixture with two valid molecular components

Do not infer these cases by naïvely parsing a SMILES string.
