# RDKit Validation Checklist

Date: 2026-06-29

Scope: Current RDKit.js validation layer only. This document does not cover 3Dmol.js, PubChem, or expanded example molecule workflows.

## Validation Rule

- Ketcher-extracted `molBlock` is validated first when both `molBlock` and `smiles` exist.
- `smiles` is used when no non-empty `molBlock` is available.
- The app shows `canonicalSmiles`, `molecularFormula`, and `molecularWeight` only when `MoleculeValidationResult.ok === true` and `validationStatus === "valid"`.
- Invalid or empty inputs must not populate formula, molecular weight, or canonical SMILES in the student-facing panel.
- Student-facing error:
  - `현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수, 전하, 원자 표기를 확인해 주세요.`
- Developer diagnostics remain in `developerLogs` and are not shown as student-facing chemistry results.

## Molecular Formula Format

The current display format is a compact formula string derived from RDKit molecule JSON after parsing succeeds.

- Carbon appears before hydrogen when present.
- Hydrogen appears before other non-carbon elements.
- Remaining elements are alphabetical.
- Count `1` is omitted.
- Examples: `H2O`, `CH4`, `C2H6O`, `C6H6`, `C2H4O2`, `C9H8O4`.

## Molecular Weight Rule

`molecularWeight` means RDKit descriptor `amw` average molecular weight.

Exact mass from RDKit descriptor `exactmw` is not displayed in this MVP and must not be mixed into the `molecularWeight` field.

## Fixed Validation Results

| Molecule | Input SMILES | RDKit canonical SMILES | Formula | Average molecular weight (`amw`) | Exact mass (`exactmw`, not displayed) | Expected status |
|---|---|---|---|---:|---:|---|
| Water | `O` | `O` | `H2O` | 18.015 | 18.01056 | valid |
| Methane | `C` | `C` | `CH4` | 16.043 | 16.0313 | valid |
| Ethanol | `CCO` | `CCO` | `C2H6O` | 46.069 | 46.04186 | valid |
| Benzene | `c1ccccc1` | `c1ccccc1` | `C6H6` | 78.11399 | 78.04695 | valid |
| Acetic acid | `CC(=O)O` | `CC(=O)O` | `C2H4O2` | 60.052 | 60.02112 | valid |
| Aspirin | `CC(=O)Oc1ccccc1C(=O)O` | `CC(=O)Oc1ccccc1C(=O)O` | `C9H8O4` | 180.15899 | 180.04225 | valid |

## Invalid Input Checks

| Case | Input | Expected result |
|---|---|---|
| Invalid SMILES | `C1CC` | `ok: false`, `validationStatus: "invalid"`, no formula, no molecular weight, no canonical SMILES |
| Empty input | no `smiles`, no `molBlock` | `ok: false`, `validationStatus: "invalid"`, student-facing message shown |

## Test Coverage

- `apps/workbench/src/services/rdkitService.test.ts`
  - fixed valid molecule outputs for water, methane, ethanol, benzene, acetic acid, and aspirin
  - formula string format
  - average molecular weight uses `amw`, not `exactmw`
  - invalid SMILES does not return chemistry outputs
  - empty input does not return chemistry outputs
  - V2000 MOL block validation path
  - repeated validation reuses one RDKit initialization
- `apps/workbench/src/components/molecule-panel/StructureInfoPanel.test.tsx`
  - valid result displays formula, average molecular weight, and canonical SMILES
  - invalid result hides chemistry outputs and raw invalid structure strings

## Verification Commands

Run from `apps/workbench`:

```powershell
npm run typecheck
npm test
npm run build
```

Note: In the current sandboxed Codex environment, `npm run build` may need an escalated rerun because Vite/esbuild child process spawning can fail with `spawn EPERM`.
