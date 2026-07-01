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
- Local dev server check: `http://127.0.0.1:5173` returned HTTP 200 with title `다양한 분자의 분자구조 모델링`.

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

## 2026-06-30 — Stabilization: 3D structure availability pipeline

### Current status

- VSEPR remains implemented but is fixed as an optional classroom module:
  - `free_draw + student`: full VSEPR panel and VSEPR model viewer are hidden by default.
  - `activity + student`: VSEPR is shown only when the selected activity template has `requiresVsepr: true`.
  - teacher mode may show VSEPR status and expected VSEPR guidance as diagnostics, not scoring.
- PubChem candidate selection now checks candidate molecular formula against the current RDKit.js validation result before CID-based 3D SDF loading.
- Formula comparison uses element counts so formula order differences such as `H3N` and `NH3` do not block valid candidates.
- If a PubChem candidate clearly conflicts with the RDKit.js formula, 3D loading is blocked and the student sees a short warning while developer logs keep CID and comparison details.
- Stale PubChem candidate-search and 3D SDF responses are ignored if the validated structure changes while the request is in flight.
- PubChem 3D success results now carry `sourceUrl` metadata while keeping RDKit.js as the formula and average molecular weight source.
- Generated `.test_runs/` images, review MP4 files, and external Claude VSEPR reference files are excluded from future commits through `.gitignore`.

### Verification

- `npx tsc --noEmit`: passed.
- `npm test -- --run`: passed with 18 files and 98 tests after rerunning outside the sandbox because the first sandboxed attempt hit the known esbuild `spawn EPERM` restriction.

### Remaining verification

- `npm run build` should still be run before final commit.
- Existing 3Dmol.js `eval` and chunk-size warnings are expected review items, not automatic build failures.

## 2026-06-30 — Phase 10 3D Viewer representation and measurement MVP

### Current status

- Added representation controls to the actual/external 3D viewer:
  - `ball-and-stick`
  - `stick`
  - `space-filling`
- Added atom label toggle. Student default labels use element symbols, while teacher mode or measurement mode uses indexed labels such as `C1` and `H2`.
- Added reset-view and zoom-to-fit controls.
- Added coordinate-based measurement MVP:
  - bond length / atom distance from two selected atoms
  - bond angle from three selected atoms, with the second selected atom as the center
- Added `coordinateDimension` to 3D data contracts so Ketcher 2D MOL blocks are not treated as actual 3D coordinate payloads.
- Measurement runs only on RDKit-validated, explicitly 3D coordinate-bearing `mol`, `sdf`, `xyz`, or `pdb` data.
- VSEPR prediction model measurement remains out of scope. VSEPR template vectors are not treated as measurable molecular coordinates.

### Intentionally not implemented in this phase

- RDKit 3D conformer generation
- Open Babel backend conversion
- SMILES-to-3D generation
- energy minimization
- treating Ketcher 2D MOL blocks as 3D coordinates
- applying measurement tools to VSEPR template vectors
- presenting bond lengths or bond angles as experimental or optimized reference values

### Verification

- `npx tsc --noEmit`: passed.
- `npm test -- --run`: passed with 19 files and 109 tests after rerunning outside the sandbox because the sandboxed attempt hit the known esbuild `spawn EPERM` restriction.
- `npm run build`: passed with the known 3Dmol.js `eval` warning and existing large chunk warnings.

## 2026-06-30 — Phase 13 actual/external 3D vs VSEPR comparison mode

### Current status

- Added `StructureComparisonState` and `StructureComparisonObservation` contracts.
- Added `apps/workbench/src/services/structureComparison.ts` to compute comparison availability from:
  - RDKit.js validation result
  - actual/external 3D coordinate availability
  - VSEPR analysis status and confidence
  - selected example/activity comparison recommendations
- Added `apps/workbench/src/components/comparison/StructureComparisonPanel.tsx`.
- Added `structureMatchStatus` to 3D data contracts so formula-compatible PubChem candidates can remain external 3D visualization data without automatically becoming comparison-mode data.
- The comparison panel:
  - shows a comparison-mode open/close control;
  - places `Molecule3DViewer` and `Vsepr3DModelViewer` side by side only when comparison is available and opened;
  - labels the left side as actual/external 3D coordinate data;
  - labels the right side as a VSEPR educational prediction model;
  - provides student observation fields for similarities, differences, and reflection;
  - shows teacher-only comparison guidance in teacher mode.
- Added comparison mode configuration to activity templates.
- Added PubChem CID metadata for ammonia and carbon dioxide so recommended comparison examples can load external 3D coordinates when available.

### Recommended comparison examples

- 물
- 메테인
- 암모니아
- 이산화탄소

### Caution examples

- 에탄올
- 벤젠
- 아스피린
- 포도당
- 복잡한 유기분자
- 전이금속 착물
- 라디칼
- 공명 구조가 중요한 분자

### Intentionally not implemented in this phase

- automatic scoring of comparison observations
- database persistence
- student login
- treating VSEPR vectors as measured 3D coordinates
- adding measurement tools to the VSEPR viewer
- SMILES-to-3D generation
- Open Babel backend conversion
- RDKit 3D conformer generation

### Verification

- `npx tsc --noEmit`: passed.
- `npm test -- --run`: passed with 21 files and 123 tests.
- `npm run build`: passed with the known 3Dmol.js `eval` warning and existing large chunk warnings.

## 2026-06-30 — Phase 15 Classroom MVP Release Candidate: local save and export

### Current status

- Added `ActivityResultSnapshot` as the student activity result contract.
- Added browser-local snapshot storage through `localStorage`.
- Added an `ActivityResultPanel` that summarizes:
  - activity information
  - student prediction values
  - RDKit.js validation result
  - actual/external 3D source and observation
  - coordinate-based measurement results
  - optional VSEPR educational prediction result
  - actual/external 3D vs VSEPR comparison observation
  - activity question answers and final reflection
- Added JSON, Markdown, TXT, clipboard copy, and browser print export flows.
- `afterValidationReflection` and `finalReflection` are stored/exported as
  separate fields so student reflection is not silently overwritten.
- Exported records keep RDKit.js as the formula, average molecular weight, and
  canonical SMILES source.
- Exported records do not include raw SDF, raw MOL block, raw PubChem response,
  HTTP status detail, Ketcher internals, or developer logs.
- Main actual/external `Molecule3DViewer` now reports measurement results to
  `App` so current coordinate-based measurements can be included in the
  activity snapshot.

### Intentionally not implemented in this phase

- student login
- Firebase or database persistence
- student-specific submission lists
- automatic grading
- PDF export
- 3D viewer image capture
- RDKit 3D conformer generation
- Open Babel backend conversion
- energy minimization

### Verification

- `npx tsc --noEmit`: passed during implementation.
- `npm test -- --run`: passed with 24 files and 131 tests during implementation.
- Final build verification should still be run immediately before commit.

## 2026-06-30 — Phase 16 student activity flow simplification

### Current status

- Changed the app entry state to `student + activity` so the first screen follows
  a classroom activity flow instead of the previous tool-centered layout.
- Added a student activity shell with six visible steps:
  1. 활동 선택
  2. 예측하기
  3. 분자 그리기
  4. 구조 확인하기
  5. 입체 구조 보기
  6. 정리하기
- Renamed the main student action from `구조 검증하기` to `구조 확인하기`.
- Renamed the VSEPR student action to `입체 구조 예측 보기`.
- Added student-facing result cards for:
  - 구조 확인 결과
  - 분자식
  - 평균 분자량
  - 입체 구조 예측
  - 실제/외부 3D 구조 제공 여부
- Moved raw structure details and advanced external lookup controls behind
  teacher/advanced mode:
  - canonical SMILES
  - raw SMILES/MOL display
  - PubChem candidate search
  - individual JSON/Markdown/TXT export buttons
  - developer logs and detailed diagnostic messages
- Kept the chemistry validation gate unchanged: Ketcher still provides the
  structure input, RDKit.js still validates and calculates formula/mass, 3Dmol.js
  still visualizes coordinate data, and PubChem loading remains manual.

### Intentionally not implemented in this phase

- new chemistry calculation behavior
- automatic PubChem matching
- automatic grading
- student login
- database persistence
- new production dependencies

### Verification

- `npm run typecheck`: passed.
- `npm test`: passed with 24 files and 131 tests.
- `npm run build`: passed with the known 3Dmol.js `eval` warning and existing
  large chunk warnings.
- Browser DOM check at `http://127.0.0.1:5173` confirmed the required student
  flow labels are present and the default student screen does not include
  `Canonical SMILES`, raw MOL placeholder text, PubChem candidate search,
  JSON/Markdown export buttons, or developer logs.

## 2026-07-01 — Phase 16-1 official classroom terminology cleanup

### Current status

- Replaced MVP/developer-facing labels in the default student screen with
  Korean action-oriented classroom terms.
- Student default mode now exposes these required actions:
  - 오늘의 활동 선택하기
  - 예측 입력하기
  - 분자 예시 불러오기
  - 내 구조 확인하기
  - 입체 구조 예상 보기 / 예상 입체 모형 보기
  - 3D 구조 보기
  - 구조 비교하기
  - 정리 작성하기
  - 임시 저장하기
  - 보고서로 저장하기
  - 활동지 인쇄하기
- Hidden implementation terms from the default student body text:
  `RDKit.js`, `Ketcher`, `PubChem`, `CID`, `SDF`, `SMILES`, `MOL`, `JSON`,
  `localStorage`, `Developer log`, and `개발자 로그`.
- Kept advanced structure strings, external 3D lookup details, raw exports, and
  developer logs available in teacher/advanced paths instead of deleting the
  underlying features.
- Renamed student-facing VSEPR explanations to electron-pair / shape prediction
  language while keeping the internal VSEPR engine and teacher guidance intact.

### Verification

- `npm run typecheck`: passed.
- `npm test`: passed with 24 files and 131 tests.
- `npm run build`: passed with the known 3Dmol.js `eval` warning and existing
  large chunk warnings.
- Browser DOM check at `http://127.0.0.1:5173` confirmed all required student
  action labels are present and the forbidden implementation terms are absent
  from `document.body.innerText`.

## 2026-07-01 — Phase 16-2 student 3D flow stabilization

### Current status

- Fixed the student-facing 3D viewer layout so the canvas no longer collapses
  inside narrow activity/free-draw cards.
- Kept validated static 3D example data when the same example structure is
  confirmed again.
- Preserved previously loaded external 3D coordinate data when the same
  canonical structure is confirmed again, while still clearing stale 3D data
  when the drawn structure changes.
- Added a student-facing external 3D data candidate search slot after RDKit
  validation succeeds. Candidate selection remains manual.
- Added `student + free_draw` rendering for drawing, result cards, external 3D
  search, 3D viewer, comparison, and result export.
- Separated 3D viewer advanced controls from coordinate measurement controls:
  teacher mode keeps full advanced controls, while student mode can show
  bond-length/bond-angle measurement only after validated 3D coordinates are
  loaded.

### Chemistry boundary

- The app still does not generate 3D coordinates from SMILES or 2D MOL blocks.
- PubChem candidate search is still manual and does not replace RDKit formula
  or average molecular weight.
- 3D measurements remain coordinate-source measurements, not experimental or
  optimized geometry values.

### Verification

- `npm run typecheck`: passed.
- Targeted `npm test -- App PubChemCandidatePanel Molecule3DViewer`: passed with
  3 files and 13 tests.
