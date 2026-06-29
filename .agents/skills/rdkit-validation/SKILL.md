---
name: rdkit-validation
description: Use when implementing or reviewing RDKit.js or RDKit-based molecule validation, canonical SMILES, molecular formula, molecular weight, descriptor calculation, aromaticity checks, valence warnings, and chemistry result gating.
---

# RDKit Validation Skill

## Purpose

Use this skill whenever the app parses or validates a molecular structure or displays chemistry-derived values.

RDKit is the deterministic validation layer. LLM reasoning must not replace it.

## Validation Rule

No formula, molecular weight, canonical SMILES, descriptor, or 3D viewer handoff should be displayed as valid unless the structure has passed RDKit parsing.

## Required Result Type

```ts
export type MoleculeValidationResult = {
  ok: boolean;
  canonicalSmiles?: string;
  formula?: string;
  molecularWeight?: number;
  warnings: string[];
  errors: string[];
  source: 'smiles' | 'molfile';
};
```

## Required Gates

1. Input is non-empty.
2. RDKit module is loaded.
3. Molecule object can be created.
4. Sanitization/parsing warnings are captured.
5. Results are computed only from the RDKit molecule object.
6. Molecule object is disposed/freed if required by the API.

## Example Molecules for Regression

Use these as initial fixtures:

| Label | SMILES | Use |
|---|---|---|
| water | O | simple inorganic molecule |
| methane | C | simple organic molecule |
| ethanol | CCO | formula/mass check |
| acetic acid | CC(=O)O | functional group check |
| benzene | c1ccccc1 | aromaticity check |
| glucose | C(C1C(C(C(C(O1)O)O)O)O)O | larger classroom molecule |
| aspirin | CC(=O)Oc1ccccc1C(=O)O | common organic example |

## Do Not

- Do not trust user-entered SMILES without parsing.
- Do not calculate formula/mass using hand-written regex parsing of SMILES.
- Do not claim stereochemistry if the input does not encode it.
- Do not claim experimental bond angles from generated 3D geometry.

## Failure Message Pattern

Korean classroom-facing errors should be direct but non-alarming:

```text
현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수, 전하, 원자 표기를 확인해 주세요.
```

## Test Requirements

- Valid fixtures produce `ok: true`.
- Empty input produces `ok: false`.
- Invalid SMILES produces `ok: false`.
- UI does not display formula/mass when `ok: false`.
- Repeated validation does not leak memory or duplicate RDKit initialization.

## Output Standard

When implementing validation, include:

1. exact inputs tested
2. expected validation result
3. UI gating behavior
4. cleanup/disposal behavior
