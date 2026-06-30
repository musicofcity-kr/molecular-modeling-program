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

### Current status

- Implemented. The top action is now `구조 검증하기`.
- The app extracts SMILES/MOL data from Ketcher, then validates the extracted structure through RDKit.js.
- RDKit.js is initialized through `apps/workbench/src/services/rdkitService.ts` and reuses a single module instance across repeated validations.
- Valid structures show canonical SMILES, molecular formula, and RDKit average molecular weight in the right panel.
- Invalid structures show a student-facing correction message and do not display formula, average molecular weight, canonical SMILES, or raw invalid structure strings in the student panel.

### Intentionally not implemented in the active RDKit validation phase

- Valence warning UI beyond RDKit parse failure status
- 3Dmol.js viewer
- PubChem lookup
- Backend validation service
- Example molecule library expansion

### Current validation gate

Chemistry-derived values are shown only when `MoleculeValidationResult.ok === true` and `validationStatus === 'valid'`. Molecular weight means RDKit descriptor `amw`; exact mass is not displayed in this MVP. RDKit failure keeps the student panel in a blocked state with the classroom-facing validation message.

### Verification

- `npm run typecheck`: passed.
- `npm test`: passed with 31 tests.
- `npm run build`: passed after rerunning outside the sandbox because the sandboxed run hit an esbuild `spawn EPERM` process restriction.
- Build output includes `/rdkit/RDKit_minimal.js` and `/rdkit/RDKit_minimal.wasm` copied from Vite public assets.

## 2026-06-30 — Phase 4 example molecule library

### Current status

- Implemented a local classroom example molecule library in `apps/workbench/src/data/exampleMolecules.ts`.
- Added nine examples:
  - 물
  - 메테인
  - 암모니아
  - 이산화탄소
  - 에탄올
  - 아세트산
  - 벤젠
  - 포도당
  - 아스피린
- Added a top example selector grouped by `category` and a `예제 불러오기` action.
- Loading an example writes the example SMILES into Ketcher, then reuses the existing Ketcher extraction and RDKit.js validation flow.
- Example `expectedFormula` values are metadata and are tested against RDKit validation output. Student-facing formula and average molecular weight still come from RDKit validation, not from example metadata.
- If `expectedFormula` and RDKit formula ever differ, the bottom log shows a warning and the student panel keeps displaying RDKit output.

### Intentionally not implemented in this phase

- 3Dmol.js viewer
- PubChem lookup
- backend example source lookup
- new molecular weight metadata in example records

### Verification

- `npm run typecheck`: passed.
- `npm test`: passed with 44 tests.
- `npm run build`: passed with the known Ketcher large chunk warning.
- Local dev server check: `http://127.0.0.1:5173` returned HTTP 200 with title `Molecule Modeling Workbench`.

## 2026-06-30 — Phase 5 3Dmol.js Viewer Shell

### Current status

- Added `3dmol@2.5.5` as the browser 3D viewer dependency.
- Added `apps/workbench/src/components/Molecule3DViewer.tsx`.
- Added a visible `3D Viewer` shell below the Ketcher/RDKit workbench and above the validation log.
- The viewer initializes 3Dmol.js with a browser-only dynamic import, supports resize, clear, and a `loadStructure(input)` function for later coordinate-bearing `mol`, `sdf`, `xyz`, or `pdb` data.
- Current Ketcher/RDKit outputs do not provide 3D coordinates, so the student-facing message is `3D 좌표 데이터가 아직 없습니다`.
- Developer log message for validated SMILES-only structures is `SMILES만으로는 아직 3D 구조를 생성하지 않음`.
- Added a favicon data URL to avoid the previous `/favicon.ico` 404 browser console error during local checks.

### Intentionally not implemented in this phase

- SMILES-to-3D conformer generation
- treating Ketcher 2D MOL blocks as 3D coordinate data
- PubChem lookup
- Open Babel backend
- RDKit conformer generation

### Verification

- `npm run typecheck`: passed.
- `npm test`: passed with 47 tests.
- `npm run build`: passed after rerunning outside the sandbox because the sandboxed run hit the known esbuild `spawn EPERM` process restriction.
- Build output includes a separate `3Dmol` chunk and still emits known large chunk warnings.

## 2026-06-30 — Phase 6 static 3D example coordinates

### Current status

- Added optional `structure3D` metadata to example molecule records.
- Added static in-app SDF coordinate examples for:
  - 물
  - 메테인
- Example loading still follows the same chemistry gate:
  - Ketcher receives the example SMILES.
  - RDKit.js validates the extracted Ketcher structure.
  - Formula, average molecular weight, and canonical SMILES come from RDKit.js.
  - 3Dmol.js receives static coordinate data only when the selected validated example has `structure3D`.
- Examples without `structure3D`, such as 에탄올, keep the student-facing message `3D 좌표 데이터가 아직 없습니다`.

### Intentionally not implemented in this phase

- SMILES-to-3D coordinate conversion
- Ketcher 2D MOL block to 3D interpretation
- PubChem lookup
- Open Babel backend conversion
- RDKit conformer generation
- energy minimization
- bond angle calculation

### Verification

- Static coordinates are labeled as educational visualization data only.
- 3Dmol.js remains a coordinate visualization layer and does not provide formula or molecular weight.

## 2026-06-30 — Phase 7 PubChem CID 3D prototype

### Current status

- Added curated PubChem CID metadata to selected example molecules:
  - 물: 962
  - 메테인: 297
  - 에탄올: 702
  - 벤젠: 241
- Added `apps/workbench/src/services/pubchem3d.ts` for CID-based 3D SDF loading.
- Added a `PubChem 3D 불러오기` action in the 3D Viewer panel.
- The action is enabled only when the selected example has a curated CID and the same example has passed the existing Ketcher -> RDKit.js validation flow.
- Successful PubChem SDF responses are passed only to 3Dmol.js as coordinate data.
- Failed PubChem requests keep the 2D editor and RDKit.js formula/average molecular weight/canonical SMILES results usable.

### Intentionally not implemented in this phase

- User-drawn SMILES automatic PubChem search
- PubChem name search
- automatic candidate matching
- PubChem molecular weight or formula display
- Open Babel backend conversion
- RDKit conformer generation
- energy minimization
- bond angle calculation

### Verification

- PubChem fetch behavior is covered with mocked service tests.
- Formula, average molecular weight, and canonical SMILES remain RDKit.js outputs.
- PubChem API URLs are kept inside the service and are not exposed in the student-facing 3D Viewer metadata.
