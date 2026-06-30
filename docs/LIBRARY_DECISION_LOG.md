# Library Decision Log

Use this file to record why a chemistry or UI dependency was added.

## Decision Template

```md
## YYYY-MM-DD — Library name

- Purpose:
- Official documentation checked:
- License:
- Browser compatibility:
- Bundle size / performance risk:
- Security/privacy risk:
- Why not implement ourselves:
- Test added:
- Decision: adopt / spike only / reject
```

## Initial Candidate Libraries

## 2026-06-29 — React/Vite/TypeScript scaffold

- Purpose: Create the first browser-first workbench shell for the classroom MVP.
- Official documentation checked: React documentation, Vite guide, TypeScript configuration guidance through the Vite template pattern.
- License: React, Vite, and TypeScript are open-source dependencies; exact license review should be repeated when `package-lock.json` is generated.
- Browser compatibility: Static Vite app target; no backend required in this phase.
- Bundle size / performance risk: Low for scaffold. Chemistry libraries are intentionally excluded from this phase.
- Security/privacy risk: Low. No student data, network chemistry lookup, or file upload path exists yet.
- Why not implement ourselves: React/Vite/TypeScript provide the standard app/runtime/build toolchain; custom tooling would not improve chemistry safety.
- Test added: `apps/workbench/src/app/App.test.tsx` checks required placeholder regions render.
- Decision: adopt for app scaffold only.

### Ketcher

- Purpose: 2D chemical structure editor.
- Decision: candidate for MVP editor.
- Risk: package integration and licensing must be checked in the target project.

## 2026-06-29 — Ketcher editor integration

- Purpose: Add the 2D molecular structure input layer and allow extraction of SMILES/MOL data.
- Official documentation checked: EPAM Ketcher GitHub README, `ketcher-react` README, `ketcher-standalone` README, and npm package metadata.
- License: `ketcher-react@3.15.0`, `ketcher-core@3.15.0`, and `ketcher-standalone@3.15.0` report `Apache-2.0`.
- Browser compatibility: Implemented through React component `Editor` plus `StandaloneStructServiceProvider`; no Indigo service or backend is required in this spike.
- Bundle size / performance risk: High. `npm run build` emitted large chunk warnings, including a roughly 24 MB minified JS chunk before gzip. Ketcher also brings many transitive UI/editor dependencies.
- Security/privacy risk: No external chemistry lookup or student data path was added. The editor runs locally in the browser bundle.
- Why not implement ourselves: A reliable chemistry editor is outside MVP scope and would be less safe than using a specialized editor.
- Test added: `apps/workbench/src/app/App.test.tsx` checks that the Ketcher integration shell renders and does not present RDKit results.
- Install warnings: npm reported peer dependency override warnings and deprecated transitive packages `deep-diff@0.3.8` and `intersection-observer@0.12.2`.
- Runtime note: Ketcher transitive browser code references Node-style `process` and `global`; `apps/workbench/index.html` provides a minimal browser polyfill so the Vite dev page does not fail before React renders.
- Scope note: The active Ketcher-only phase stops after SMILES/MOL extraction. It does not install or call RDKit.js, 3Dmol.js, PubChem, or molecular weight calculation.
- Extraction note: The wrapper requests SMILES through `getSmiles()` and MOL block through `getMolfile('v2000')`, then stores both as unvalidated `MoleculeInput` data.
- Limitation: Extracted Ketcher data is displayed for inspection only. Long MOL blocks are scrollable in the right panel, and no chemical correctness or molecular weight is claimed before a later RDKit.js validation layer.
- Decision: adopt for Ketcher-only integration spike; revisit code splitting and bundle size before production deployment.

### RDKit.js

- Purpose: deterministic molecule parsing, rendering, formula/molecular descriptors where supported.
- Decision: candidate for MVP validation layer.
- Risk: WASM loading and maintenance state must be checked before locking version.

## 2026-06-29 — RDKit.js validation layer deferred

Superseded by the adoption decision below.

## 2026-06-29 — RDKit.js validation layer

- Purpose: Deterministically validate Ketcher-extracted SMILES/MOL block data before showing canonical SMILES, molecular formula, or molecular weight.
- Official documentation checked: Local `@rdkit/rdkit` package README, package metadata, and TypeScript declarations for `initRDKitModule`, `get_mol`, `is_valid`, `get_smiles`, `get_json`, `get_descriptors`, and `delete`.
- License: `@rdkit/rdkit@2025.3.4-1.0.0` reports `BSD-3-Clause`.
- Browser compatibility: Uses RDKit.js MinimalLib through `/rdkit/RDKit_minimal.js` and `/rdkit/RDKit_minimal.wasm` static assets. The loader passes `locateFile` so the browser can find the WASM file in Vite public assets.
- Bundle size / performance risk: Medium. The WASM asset is about 6.9 MB and is initialized lazily on first validation, then reused.
- Security/privacy risk: Low for this step. Validation runs locally in the browser; no PubChem, backend, or external network chemistry lookup was added.
- Why not implement ourselves: SMILES/MOL parsing, sanitization, canonical SMILES, and descriptor calculation must come from a chemistry toolkit, not custom or LLM-generated parsing.
- Test added: `apps/workbench/src/services/rdkitService.test.ts` covers empty input, invalid SMILES, existing classroom fixtures, MOL block validation, molecular formula, average molecular weight from `amw`, canonical SMILES, and single RDKit initialization reuse. `StructureInfoPanel` tests cover hiding chemistry output when validation fails.
- Limitation: Formula display is derived from RDKit molecule JSON after RDKit parsing; the helper currently supports common classroom elements needed by the MVP fixture set. Broader element support should be expanded with explicit tests before using uncommon elements in class.
- Limitation: This step does not implement valence warning UI, 3Dmol.js visualization, PubChem lookup, or example molecule expansion.
- Decision: adopt for the MVP validation layer.

### 3Dmol.js

- Purpose: browser-based 3D molecular visualization.
- Decision: Phase 2 viewer candidate.
- Risk: 3D coordinates and conformer generation should not be overstated.

## 2026-06-30 — 3Dmol.js Viewer Shell

- Purpose: Add a browser-based 3D molecular visualization shell that can later render coordinate-bearing molecule data after RDKit validation.
- Official documentation checked: 3Dmol.js documentation for npm usage, `createViewer`, model loading, `clear()`, `resize()`, and render flow; installed `3dmol@2.5.5` package metadata and TypeScript declarations.
- License: `3dmol@2.5.5` reports `BSD-3-Clause`.
- Browser compatibility: Runs as a client-side WebGL viewer inside React. The component initializes 3Dmol.js with a browser-only dynamic import so server-side/static render tests do not instantiate WebGL.
- Bundle size / performance risk: Medium. 3Dmol.js adds WebGL rendering code to the Vite bundle and should remain isolated from Ketcher/RDKit state. `npm run build` produced a separate `3Dmol` chunk of about 588 KB before gzip and retained the existing large Ketcher/RDKit-related chunk warning.
- Build warning: Vite warned that `node_modules/3dmol/build/3Dmol.js` uses `eval`; keep this dependency isolated and re-check before production deployment.
- Security/privacy risk: Low in this phase. No PubChem, backend conversion, Open Babel, or remote structure lookup is called.
- Why not implement ourselves: Molecular 3D rendering, camera control, model parsing, and WebGL management are specialized concerns and should not be hand-rolled for a classroom MVP.
- Test added: `apps/workbench/src/components/Molecule3DViewer.test.tsx` verifies the no-coordinate student message and coordinate source/format labels.
- Install note: `npm install 3dmol` added 6 packages, found 0 vulnerabilities, and repeated the existing Ketcher `miew-react` React 18 peer dependency warning under the React 19 app.
- Scope note: The viewer shell does not generate 3D conformers from SMILES, does not treat Ketcher 2D MOL blocks as 3D structures, and does not override RDKit validation.
- Decision: adopt for viewer shell only; coordinate generation/import remains a later, separately validated feature.

## 2026-06-30 — Static 3D example coordinate handoff

- Purpose: Connect a small number of local example molecules to 3Dmol.js with explicit coordinate-bearing data while preserving the Ketcher -> RDKit.js validation flow.
- Decision: Add static in-app SDF coordinate examples for water and methane only.
- PubChem: Not integrated in this phase.
- SMILES-to-3D conversion: Not implemented in this phase.
- Open Babel / backend conversion: Not implemented in this phase.
- RDKit 3D conformer generation: Not implemented in this phase.
- 3Dmol.js role: Coordinate data visualization only. It does not validate chemistry and does not provide formula, molecular weight, canonical SMILES, energy, bond angle, or optimized geometry.
- Source label: Static examples are labeled `예제 내장 3D 구조` and include a note that they are educational static coordinates, not experimental values, energy-minimized results, or bond-angle calculation data.
- Safety gate: The app sends static 3D data to the viewer only after the selected example passes RDKit.js validation; examples without static coordinates keep the student-facing no-coordinate message.
- Test added: `apps/workbench/src/data/exampleMolecules.test.ts` checks that only water and methane currently have static 3D data and that the records remain molecular-weight-free metadata.

### Open Babel

- Purpose: optional backend conversion for chemical file formats.
- Decision: not MVP unless import/export requirements demand it.
- Risk: server-side dependency complexity.

### PubChem PUG-REST

- Purpose: name/compound lookup.
- Decision: Phase 5 candidate.
- Risk: external API dependence and classroom network reliability.

## 2026-06-30 — PubChem PUG-REST 3D structure candidate deferred

- Purpose: Evaluate PubChem PUG-REST as a future source for external coordinate-bearing 3D records, such as SDF, for molecules that do not have embedded static 3D examples.
- Official documentation checked: PubChem PUG-REST documentation at https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest.
- Decision: Defer API integration.
- Reason for deferral: The app should first stabilize the 3Dmol.js Viewer Shell, static 3D examples, source metadata, and the 3D data trust policy before adding classroom network dependency or candidate matching logic.
- Current boundary: No PubChem API calls, no external fetch service, no Open Babel conversion, no RDKit conformer generation, and no SMILES-to-3D conversion were added in this phase.
- Required future gate: PubChem 3D data may be shown only after the current Ketcher structure passes RDKit.js validation and the external result is labeled with source metadata.
- Known risk: PubChem may have no 3D coordinate record for a molecule, may return multiple candidates, or may return a structure that does not match the current RDKit-validated structure.
- Required UI/log behavior: Student-facing failures must remain short and non-technical; developer logs must include query key, source URL or endpoint, candidate identifier when available, and mismatch/failure reason.
- Test/verification: Documentation-only phase. Existing checks remain `npx tsc --noEmit`, `npm test`, and `npm run build`.
