# RDKit Validation Checklist

Date: 2026-07-27

Scope: Current RDKit.js validation layer only. This document does not cover 3Dmol.js, PubChem, or expanded example molecule workflows.

## Validation Rule

- Ketcher-extracted `molBlock` is validated first when both `molBlock` and `smiles` exist.
- `smiles` is used when no non-empty `molBlock` is available.
- The app shows `canonicalSmiles`, `molecularFormula`, and `molecularWeight` only when `MoleculeValidationResult.ok === true` and `validationStatus === "valid"`.
- Invalid or empty inputs must not populate formula, molecular weight, or canonical SMILES in the student-facing panel.
- Student-facing base error:
  - `현재 구조는 계산에 사용할 수 있는 분자 구조로 확인되지 않았습니다. 원자 표기, 결합 수, 전하를 고친 뒤 다시 2D 구조 분석하기를 눌러 주세요.`
- Nonzero net charge, isotope, radical, disconnected graph, and query
  structures use separate actionable messages.
- Developer diagnostics remain in `developerLogs` and are not shown as student-facing chemistry results.

## Formal Charge And Annotation Policy

- Formal charge is summed across every RDKit JSON atom.
- A connected charge-separated structure with net formal charge `0` may pass.
  Its successful result must retain a warning that the structure is neutral
  overall but contains formal charge separation.
- A structure with net formal charge other than `0` fails closed and does not
  expose formula, molecular weight, or canonical SMILES.
- Isotope and radical annotations continue to fail closed regardless of net
  charge.
- Formal charge must not be removed merely to make validation pass.

| Case | Input | Expected result |
|---|---|---|
| Ozone | `[O-][O+]=O` | valid, formula `O3`, charge-separation warning |
| Nitromethane | `C[N+](=O)[O-]` | valid, formula `CH3NO2`, charge-separation warning |
| Ammonium | `[NH4+]` | invalid because net formal charge is `+1` |
| Chloride | `[Cl-]` | invalid because net formal charge is `-1` |
| Isotopic water | `[2H]O[2H]` | invalid because isotope annotations are outside scope |
| Radical oxygen | `[O]` | invalid because radical annotations are outside scope |

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
| Net charged ion | `[NH4+]` or `[Cl-]` | `ok: false`, explicit nonzero-net-charge message, no chemistry outputs |
| Isotope or radical | `[2H]O[2H]` or `[O]` | `ok: false`, annotation-specific message, no chemistry outputs |

## Test Coverage

- `apps/workbench/src/services/rdkitService.test.ts`
  - fixed valid molecule outputs for water, methane, ethanol, benzene, acetic acid, and aspirin
  - formula string format
  - average molecular weight uses `amw`, not `exactmw`
  - invalid SMILES does not return chemistry outputs
  - empty input does not return chemistry outputs
  - ozone and nitromethane return formula/canonical output plus a
    charge-separation warning
  - ammonium and chloride remain blocked by nonzero net formal charge
  - isotope and radical annotations remain blocked
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
