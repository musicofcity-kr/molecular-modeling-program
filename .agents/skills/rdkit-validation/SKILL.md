---
name: rdkit-validation
description: Use when implementing or reviewing RDKit.js molecule parsing, sanitization, graph extraction, canonical representation, formula, molecular weight, warnings, cleanup, and chemistry result gating after connectivity policy.
---

# RDKit Validation Skill

## Purpose

Use this skill whenever the app parses a molecular structure or displays chemistry-derived values.

RDKit is the deterministic validation layer. LLM reasoning must not replace it.

## Two Separate Decisions

Do not collapse these states:

1. **Connectivity/construction decision**: Did the student create the intended number of connected components?
2. **Chemical validation decision**: Can RDKit parse/sanitize and derive chemistry values?

A disconnected multi-fragment input may be parseable but still invalid for a `single-molecule` activity.

## Required Result Model

Use an equivalent of:

```ts
export type MoleculeValidationResult = {
  ok: boolean;
  validationStatus: 'valid' | 'invalid' | 'error';
  source?: 'smiles' | 'mol-block';
  canonicalSmiles?: string;
  molecularFormula?: string;
  molecularWeight?: number;
  graphSummary?: MoleculeGraphSummary;
  connectivityStatus?:
    | 'single-component'
    | 'multiple-components-allowed'
    | 'multiple-components-blocked';
  warnings: string[];
  errors: string[];
  developerLogs: string[];
};
```

## Required Gates

1. Input is non-empty.
2. RDKit module is loaded once and failure is recoverable.
3. Molecule object can be created.
4. Parsing/sanitization warnings are captured where the API permits.
5. Atom/bond graph is available for connectivity inspection.
6. Structure intent policy passes or returns an explicit blocked state.
7. Formula/mass/canonical form are computed only from the RDKit molecule object.
8. Molecule objects and temporary objects are disposed according to the API.
9. Stale results are cleared after editor changes.

## Connectivity Data Source

Use an official RDKit fragment/graph API verified for the installed version, or derive a graph from RDKit JSON. Do not count components by splitting SMILES with a regular expression.

If Molfile graph parsing is used before RDKit, validate the parser separately and keep RDKit as the chemistry truth layer.

## Multi-Component Policy

- `single-molecule`: multiple components block confident completion.
- `ionic-compound`: multiple components may pass with explicit ion/formula-unit messaging.
- `mixture`: multiple components may pass, but a single molecular formula/mass must not be misleadingly presented.

## Regression Fixtures

| Label | Input | Graph expectation | Use |
|---|---|---|---|
| water | `O` | 1 component | simple molecule |
| methane | `C` | 1 component | implicit H |
| ethanol | `CCO` | A=3, B=2, C=1 | chain |
| butane | `CCCC` | A=4, B=3, C=1 | direct linear chain |
| isolated carbons | editor/Molfile with four C and no bonds | A=4, B=0, C=4 | construction failure |
| acetic acid | `CC(=O)O` | 1 component | functional group |
| benzene | `c1ccccc1` | 1 component | aromaticity |
| ionic pair | explicit charged fragments | >1 components | intent policy |

A/B/C = atom/bond/component count.

## Do Not

- Do not trust user-entered SMILES without RDKit parsing.
- Do not calculate formula/mass using regex parsing of SMILES.
- Do not treat `mol.is_valid()` or parse success as proof of one connected molecule.
- Do not infer missing bonds from atom coordinates.
- Do not claim stereochemistry if input does not encode it.
- Do not claim experimental bond angles from generated coordinates.

## Failure Messages

Invalid chemistry:

```text
현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수, 전하, 원자 표기를 확인해 주세요.
```

Disconnected single molecule:

```text
현재 구조가 여러 조각으로 나뉘어 있습니다. 하나의 분자를 만들려면 원자 사이를 결합으로 연결해 주세요.
```

## Test Requirements

- Valid fixtures return valid chemistry.
- Empty and invalid inputs fail.
- Four isolated carbons are blocked in single-molecule mode.
- Linear C4 passes with expected graph counts.
- Ionic/mixture exceptions are explicit and tested.
- UI hides or qualifies formula/mass when policy does not pass.
- Repeated validation does not leak memory or duplicate initialization.
- Editor changes invalidate prior results.

## Output Standard

Include:

1. exact inputs and structure intent
2. expected graph/connectivity result
3. expected RDKit result
4. UI gating behavior
5. cleanup/disposal behavior
6. installed API/version evidence
