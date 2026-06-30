# PubChem Matching Policy

## Purpose

This policy defines how Molecule Modeling Workbench connects or may later extend user-drawn structure matching to PubChem without implying that an external match is automatically correct.

The current prototype supports manual candidate search only after RDKit.js validation. It does not implement automatic PubChem search, automatic candidate selection, or hidden user-drawn SMILES lookup.

## Matching Gate

1. A user-drawn structure must first be extracted from Ketcher as machine-readable SMILES and/or MOL block.
2. The extracted structure must pass RDKit.js validation.
3. The app may use the RDKit.js `canonicalSmiles` as a future PubChem candidate-search input.
4. The app must not assume that a valid `canonicalSmiles` necessarily exists in PubChem.
5. The app must not search PubChem automatically as a hidden side effect of drawing or validation.
6. The user must explicitly click `PubChem 후보 검색` before PubChem receives the canonical SMILES.

## Candidate Outcomes

PubChem candidate search may return:

- 0 candidates: no external PubChem candidate is available.
- 1 candidate: one external data candidate is available, but still needs explicit user confirmation before 3D loading.
- multiple candidates: the app must not automatically pick one; the user must review candidate identity before continuing.
- error: network, API, parsing, or service failure.

The student-facing UI should use the phrase `외부 데이터 후보` for PubChem matches. It should not present a candidate as a confirmed structure until the user confirms it.

Before a confirmed candidate is used for 3D loading, the app performs a
frontend compatibility check against the current RDKit.js validation result:

- if the candidate has a molecular formula and it is not compositionally
  compatible with the RDKit.js molecular formula, block 3D loading;
- compare formulas by element counts, not by raw string order, so `H3N` and
  `NH3` are treated as the same composition;
- if PubChem SMILES notation differs from RDKit.js canonical SMILES, keep
  RDKit.js as the calculation source and show/log a warning instead of
  overwriting the validated result;
- if the RDKit validation result changes while a PubChem request is in flight,
  ignore the stale PubChem response.

## Role Separation

- Ketcher is the 2D structure input layer.
- RDKit.js is the validation, molecular formula, average molecular weight, and canonical SMILES source.
- PubChem is an external data candidate source.
- PubChem 3D structures are visualization data only.
- 3Dmol.js visualizes coordinate-bearing data; it does not validate chemistry and does not calculate formula or molecular weight.

## Calculation Source Rule

Molecular formula and molecular weight remain RDKit.js validation results.

PubChem molecular formula, molecular weight, title, synonym, or SDF property values must not replace RDKit.js outputs in the student result panel. PubChem values may be shown later only as external candidate metadata with source labels and mismatch warnings.

## Mismatch Policy

If a PubChem candidate disagrees with the current RDKit.js-validated structure, the app must:

- keep RDKit.js formula and average molecular weight visible if the original structure is valid;
- block automatic 3D loading for that candidate;
- show a student-facing warning that an external data candidate may not match the current structure;
- record developer logs with candidate CID, RDKit canonical SMILES, PubChem candidate metadata used for comparison, and the mismatch reason.

Current MVP enforcement blocks obvious molecular-formula mismatches before CID
3D SDF loading. More advanced structure-equivalence checks remain a later
feature and must not replace the RDKit.js validation gate.

Student-facing wording should stay short and non-technical. Developer logs should contain enough detail to reproduce or diagnose the mismatch.

## Manual Lookup Flow

```text
User draws structure in Ketcher
  -> Ketcher exports SMILES/MOL
  -> RDKit.js validates structure
  -> RDKit.js returns canonicalSmiles, formula, average molecular weight
  -> user explicitly clicks PubChem 후보 검색
  -> app shows PubChem result as 외부 데이터 후보
  -> user reviews 0/1/multiple candidates
  -> user confirms one candidate
  -> app requests CID-based 3D SDF
  -> 3Dmol.js visualizes the coordinate data
```

## Non-Goals For Current Phase

- No automatic PubChem search from user-drawn structures.
- No automatic candidate ranking or selection.
- No PubChem formula or molecular weight replacing RDKit.js values.
- No Open Babel backend.
- No RDKit 3D conformer generation.
- No energy minimization.
- No bond angle or bond length calculation.

## Draft Type Boundary

The canonical TypeScript draft lives in `apps/workbench/src/types/molecule.ts`:

```ts
export type PubChemMatchStatus =
  | 'not_requested'
  | 'searching'
  | 'no_match'
  | 'single_candidate'
  | 'multiple_candidates'
  | 'error';

export interface PubChemCandidate {
  cid: number;
  title?: string;
  molecularFormula?: string;
  molecularWeight?: string;
  canonicalSmiles?: string;
  isomericSmiles?: string;
  source: 'pubchem';
}

export type PubChemCandidateSearchResult =
  | {
      ok: true;
      status: 'no_match' | 'single_candidate' | 'multiple_candidates';
      candidates: PubChemCandidate[];
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    }
  | {
      ok: false;
      status: 'error';
      candidates: [];
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    };

export type SearchPubChemCandidatesByCanonicalSmiles = (
  canonicalSmiles: string,
) => Promise<PubChemCandidateSearchResult>;
```

The current service returns student-facing messages and developer logs with the candidates so the UI can separate classroom feedback from diagnostics.

## Activity Result Export Boundary

Activity result export may record PubChem only as an external 3D source label
or source note after the user explicitly loads a CID-based 3D structure or
selects a manual candidate.

Default student exports must not include:

- raw PubChem API responses
- HTTP status details
- raw SDF payloads
- PubChem molecular weight as a replacement for RDKit.js molecular weight
- PubChem formula as a replacement for RDKit.js formula

If PubChem loading fails, exported records may still include RDKit.js validation
values and student reflection, but they should not imply that PubChem 3D data
was available.
