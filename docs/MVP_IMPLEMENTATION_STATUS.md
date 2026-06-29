# MVP Implementation Status

## 2026-06-29 — Phase 1 scaffold

### Implemented

- Created a React + Vite + TypeScript project under `apps/workbench`.
- Added the first classroom workbench layout:
  - top title/status area
  - left molecule editor placeholder
  - right structure information placeholder
  - bottom log/validation result placeholder
- Added a small scaffold smoke test that checks the required placeholder regions render.

### Intentionally not implemented

- Ketcher integration
- RDKit.js integration
- 3Dmol.js integration
- PubChem or external chemistry lookup
- Molecular formula, molecular weight, canonical SMILES, or chemical validation logic

### Current validation gate

No chemistry-derived value is shown. The right-side structure panel explicitly marks formula, molecular weight, and SMILES/MOL as future values that must wait for Ketcher extraction and RDKit.js validation.

### Verification

- `npm install`: passed, 0 vulnerabilities reported.
- `npm run typecheck`: passed.
- `npm test`: passed with 1 scaffold render test.
- `npm run build`: passed.
- Note: Vitest and Vite build require esbuild child processes; in the sandboxed environment, Vitest needed an escalated rerun after an initial `spawn EPERM` failure.

### Next recommended step

Create the core TypeScript contracts for editor input, extracted structure data, and RDKit validation results before integrating any chemistry library.

## 2026-06-29 — Phase 2 Ketcher integration

### Implemented

- Added `ketcher-react`, `ketcher-core`, and `ketcher-standalone` as the Ketcher-only editor dependencies.
- Replaced the left placeholder with a Ketcher 2D structure editor host.
- Added a narrow `ChemicalEditorHandle` wrapper with:
  - `getSmiles()`
  - `getMolfile()`
  - `extractStructure()`
  - `setMolecule()`
  - `clear()`
- Added a top action button to extract current Ketcher SMILES/MOL data.
- Added temporary right-panel display for extracted SMILES/MOL.
- Added bottom log messages for Ketcher readiness, extraction success, and extraction errors.

### Intentionally not implemented

- RDKit.js validation
- Molecular formula calculation
- Molecular weight calculation
- Canonical SMILES
- 3Dmol.js viewer
- PubChem lookup
- Backend services

### Current validation gate

Extracted SMILES/MOL is explicitly marked as `Ketcher 추출 완료 / RDKit.js 미검증`. The app still does not show formula, molecular weight, valence warnings, or canonical SMILES.

### Dependency notes

- Ketcher packages are `3.15.0` and report `Apache-2.0`.
- `ketcher-react` supports React `^18.2.0 || ^19.0.0` as a peer dependency, so the current React 19 scaffold is compatible by metadata.
- `npm install` reported peer dependency override warnings and deprecated transitive packages `deep-diff@0.3.8` and `intersection-observer@0.12.2`.
- `npm run build` succeeded but emitted large chunk warnings, including a Ketcher-related JS chunk around 24 MB before gzip. Production work should consider code splitting.

### Verification

- `npm run typecheck`: passed.
- `npm test`: passed with 1 shell/render test.
- `npm run build`: passed with large chunk warnings.
- Local dev server check: `http://127.0.0.1:5173` returned HTTP 200 and included the app marker text.
- Note: Vitest and Vite build still require escalated execution in this sandbox because esbuild child processes fail with `spawn EPERM` otherwise.

## 2026-06-29 — Phase 3 RDKit.js validation layer

### Implemented

- Added `@rdkit/rdkit@2025.3.4-1.0.0`.
- Added RDKit static assets under `apps/workbench/public/rdkit`.
- Added lazy RDKit initialization through `rdkit-loader.ts`.
- Added `validateMoleculeInput()` for SMILES/MOL input validation.
- Added formula calculation from RDKit-parsed molecule JSON atom data, not from raw SMILES parsing.
- Added average molecular weight from RDKit descriptors.
- Added canonical SMILES from RDKit molecule output.
- Connected the top `구조 검증하기` action to:
  - extract Ketcher SMILES/MOL
  - run RDKit validation
  - show formula, molecular weight, and canonical SMILES only when validation succeeds
  - show a Korean student-facing error when validation fails
  - keep RDKit parser/WASM details in developer log messages

### Intentionally not implemented

- 3Dmol.js viewer
- PubChem lookup
- Backend validation service
- Name-to-structure inference
- 3D conformer generation

### Current validation gate

The result panel renders formula, molecular weight, and canonical SMILES only when `MoleculeValidationResult.ok === true`. If validation fails, the panel hides calculated values and raw invalid SMILES/MOL strings, then shows only the student-facing validation message.

### Dependency notes

- RDKit.js reports `BSD-3-Clause`.
- RDKit WASM asset size is about 6.9 MB.
- Browser loading follows the RDKit.js README asset pattern with `locateFile`.
- Build no longer emits RDKit `fs`/`crypto` externalization warnings after switching browser loading to the static script asset.
- Ketcher remains the dominant bundle-size risk.

### Verification

- `npm run typecheck`: passed with `tsc -b`.
- `npm test`: passed with 13 tests.
- `npm run build`: passed with existing Ketcher large chunk warnings.
- Local dev server check: app route, RDKit JS asset, and RDKit WASM asset returned HTTP 200.
