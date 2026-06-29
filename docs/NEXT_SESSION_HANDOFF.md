# Next Session Handoff — 2026-06-29

## Current State

- Project root: `C:\all\molecule-modeling-skill-package`
- App root: `apps/workbench`
- Stack: React + Vite + TypeScript
- Current MVP phase: Ketcher 2D structure input, RDKit.js validation, and local example molecule library
- Local dev server: not required to remain running; start again with `npm run dev -- --port 5173`

## Completed Today

1. Read and followed repository guidance from `AGENTS.md` and `.agents/skills`.
2. Created the React/Vite/TypeScript workbench shell.
3. Integrated Ketcher as the 2D molecule structure input layer.
4. Added a narrow Ketcher extraction boundary:
   - `getSmiles()`
   - `getMolfile('v2000')`
   - `extractStructure()`
5. Defined and used the Molecule Data Contract in `apps/workbench/src/types/molecule.ts`.
6. Added RDKit.js validation in `apps/workbench/src/services/rdkitService.ts`.
7. Added RDKit static browser assets:
   - `apps/workbench/public/rdkit/RDKit_minimal.js`
   - `apps/workbench/public/rdkit/RDKit_minimal.wasm`
8. Added validation gating:
   - Valid structures display canonical SMILES, molecular formula, and average molecular weight.
   - Invalid structures hide formula, average molecular weight, canonical SMILES, and raw invalid structure strings in the student panel.
9. Fixed molecular weight wording so the MVP consistently means RDKit descriptor `amw`, not `exactmw`.
10. Recorded the work in `C:\all\LLM wiki`.
11. Added a local example molecule library and top-level example loader.

## Fixed RDKit Validation Baseline

| Molecule | SMILES | Formula | Average molecular weight (`amw`) |
|---|---|---|---:|
| Water | `O` | `H2O` | 18.015 |
| Methane | `C` | `CH4` | 16.043 |
| Ethanol | `CCO` | `C2H6O` | 46.069 |
| Benzene | `c1ccccc1` | `C6H6` | 78.11399 |
| Acetic acid | `CC(=O)O` | `C2H4O2` | 60.052 |
| Aspirin | `CC(=O)Oc1ccccc1C(=O)O` | `C9H8O4` | 180.15899 |

Exact mass `exactmw` is documented only as a comparison value in `docs/RDKIT_VALIDATION_CHECKLIST.md`; it is not displayed in the app.

## Last Verified

Run from `apps/workbench`:

```powershell
npm run typecheck
npm test
npm run build
```

Latest results:

- `npm run typecheck`: passed
- `npm test`: passed, 5 files / 44 tests
- `npm run build`: passed
- Build warning: Ketcher still creates a large production chunk. This is known and documented, not a current functional failure.

## Important Uncommitted Work

The working tree still has uncommitted changes. Do not reset or checkout files before reviewing them.

Key untracked additions include:

- `apps/workbench/src/editor/ketcher-structure-extraction.ts`
- `apps/workbench/src/editor/ketcher-structure-extraction.test.ts`
- `apps/workbench/src/services/rdkitService.ts`
- `apps/workbench/src/services/rdkitService.test.ts`
- `apps/workbench/src/services/molecularFormula.ts`
- `apps/workbench/public/rdkit/`
- `docs/RDKIT_VALIDATION_CHECKLIST.md`
- `docs/NEXT_SESSION_HANDOFF.md`
- `apps/workbench/src/data/exampleMolecules.ts`
- `apps/workbench/src/data/exampleMolecules.test.ts`
- `docs/EDUCATION_USE_CASES.md`

## Recommended First Step Tomorrow

1. Check the working tree:

```powershell
git status --short
```

2. Re-run quick verification:

```powershell
cd apps\workbench
npm run typecheck
npm test
```

3. If still green, make a commit before adding new features:

```powershell
git add .
git commit -m "feat: add RDKit validation layer"
```

4. Then choose the next feature. Recommended order:
   - Playwright smoke test for example load -> Ketcher extract -> RDKit validate
   - Playwright smoke test for Ketcher draw -> extract -> RDKit validate
   - RDKit validation message refinement / valence warning UI
   - only after that, 3Dmol.js visualization

## Still Not Implemented

- 3Dmol.js integration
- PubChem lookup
- example molecule library expansion
- backend validation service
- valence warning UI beyond RDKit parse failure
