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

## 2026-06-30 — PubChem PUG-REST CID-based 3D SDF prototype

- Purpose: Load external coordinate-bearing 3D SDF data for curated example molecules through PubChem CID, then pass the SDF to 3Dmol.js for classroom visualization.
- Official documentation checked: PubChem PUG-REST documentation at https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest and the CID SDF endpoint shape `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/record/SDF?record_type=3d`.
- License: No new package dependency was added. PubChem is an external NCBI service; source attribution and classroom network reliability remain operational concerns.
- Browser compatibility: Uses browser `fetch` from the React app. No backend proxy, Open Babel service, RDKit conformer generation, or server-side chemistry conversion was introduced.
- Bundle size / performance risk: Low for bundle size because no dependency was added. Runtime risk shifts to classroom network availability and PubChem response latency.
- Security/privacy risk: Medium-low for this prototype. The app only requests curated numeric CIDs from local example metadata. It does not send user-drawn SMILES, MOL blocks, student names, or worksheet data to PubChem.
- Why not implement ourselves: External coordinate records should come from a chemistry data provider or curated source; frontend code must not invent 3D coordinates.
- Scope boundary: This is not a PubChem search system. User-input SMILES automatic matching, name search, candidate ranking, and mismatch reconciliation are still not implemented.
- Chemistry boundary: PubChem SDF is used only as coordinate-bearing visualization input. Formula, average molecular weight, canonical SMILES, and validation status remain RDKit.js outputs.
- Student-facing failure: If loading fails, the app says that PubChem 3D data could not be loaded and that the 2D structure plus RDKit verification results remain usable.
- Developer logging: Failure logs include `PubChem 3D SDF fetch failed`, CID, HTTP status where available, response text excerpt where available, and fetch error message where available.
- Test added: `apps/workbench/src/services/pubchem3d.test.ts` covers successful SDF mapping, no-data HTTP failure, network failure, and keeping the long API URL out of `Molecule3DInput.sourceUrl`.
- Decision: spike only for curated CID-based example molecules.

## 2026-07-02 — Curated example PubChem 3D auto-load

- Purpose: Reduce classroom confusion where examples with a curated PubChem CID but no static 3D payload appeared to have no 3D structure until the user found the manual load button.
- Decision: After RDKit.js validation succeeds for a selected example, the app automatically requests CID-based PubChem 3D SDF only when the example has `external3DSource: 'pubchem'`, has a numeric `pubchemCid`, and does not already have static `structure3D`.
- Boundary: This is not automatic PubChem matching for arbitrary user-drawn structures. Free-draw structures still require manual candidate search and manual candidate selection.
- Chemistry boundary: RDKit.js remains the source for formula, average molecular weight, canonical SMILES, and validation status. PubChem SDF remains coordinate visualization input only.
- Failure behavior: If PubChem has no 3D data or the network fails, the RDKit.js validation result remains visible and the viewer reports that external 3D data could not be loaded.
- Test added: `apps/workbench/src/app/App.test.tsx` covers that auto-load eligibility applies to PubChem-only curated examples such as ethanol, but not to static examples such as water or no-CID examples such as aspirin.

## 2026-06-30 — PubChem manual candidate matching policy

- Purpose: Define the safety boundary for later connecting user-drawn RDKit-validated structures to PubChem candidate search.
- Official documentation checked: PubChem PUG-REST documentation at https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest.
- Decision: Defer automatic PubChem matching for user-drawn structures.
- Reason for deferral: RDKit.js canonical SMILES can be a useful query key, but it does not guarantee that PubChem has the same molecule or that returned candidates should be trusted without review.
- Matching boundary: A user-drawn structure must pass RDKit.js validation before PubChem candidate search can be requested. Validation alone must not trigger network lookup.
- Candidate policy: PubChem search may return zero, one, or multiple candidates. The app must not automatically select a candidate, including the single-candidate case, until the UI has a manual confirmation gate.
- UI language: Student-facing UI should call returned items `외부 데이터 후보`, not confirmed structures.
- Chemistry boundary: RDKit.js remains the source for formula, average molecular weight, canonical SMILES, and validation status. PubChem candidate metadata and 3D SDF data must not replace RDKit.js values.
- Risk: Automatic matching could show a plausible but wrong external 3D structure for a student-drawn molecule, especially when stereochemistry, salts, tautomers, charges, or ambiguous representations are involved.
- Implementation note: This phase adds only policy documentation and TypeScript draft types. It does not implement `searchPubChemCandidatesByCanonicalSmiles`, automatic search, candidate ranking, or automatic 3D loading from user input.
- Test/verification: `npx tsc --noEmit` and `npm run build`; existing CID-based 3D prototype tests remain unchanged.

## 2026-06-30 — PubChem manual candidate search UI prototype

- Purpose: Let the user explicitly request PubChem external data candidates for an RDKit.js-validated structure, then manually choose a candidate for existing CID-based 3D SDF loading.
- Official documentation checked: PubChem PUG-REST documentation at https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest and the `compound/smiles/property/.../JSON` PUG-REST endpoint shape.
- License: No new dependency was added. PubChem remains an external NCBI service.
- Browser compatibility: Uses browser `fetch` through `src/services/pubchemSearch.ts`; no backend proxy or Open Babel conversion was introduced.
- Bundle size / performance risk: Low for bundle size because no package was added. Runtime risk remains classroom network availability and PubChem response latency.
- Security/privacy risk: Medium. The search sends only RDKit.js canonical SMILES after a user clicks `PubChem 후보 검색`; it does not run as a hidden automatic lookup.
- Why not automatic matching: PubChem search can return zero, one, or multiple candidates, and a plausible candidate can still be wrong for salts, charges, stereochemistry, or alternate representations.
- Auto-selection policy: The app does not auto-select a candidate, including the single-candidate case.
- Chemistry boundary: RDKit.js remains the source for formula, average molecular weight, canonical SMILES, and validation status. PubChem molecular formula and molecular weight are candidate metadata only.
- 3D loading boundary: Candidate selection reuses `fetchPubChem3DSdf(...)`; no second 3D SDF fetch path was added.
- Test added: `apps/workbench/src/services/pubchemSearch.test.ts` covers successful mapping, no-match responses, HTTP errors, and empty canonical SMILES. `apps/workbench/src/components/pubchem/PubChemCandidatePanel.test.tsx` covers disabled pre-validation UI and external candidate display.
- Decision: adopt as a manual candidate-search prototype only.

## 2026-07-01 — Firebase Web SDK Auth phase 1

- Purpose: Connect browser-side Firebase Auth for student anonymous sessions and teacher Google/email login before enabling Firestore persistence.
- Official documentation checked: Firebase Web Auth getting started, anonymous auth, Google sign-in, and password auth documentation.
- License: `firebase@12.15.0` reports `Apache-2.0`.
- Browser compatibility: Uses modular `firebase/app` and `firebase/auth` imports. Firebase App/Auth are initialized lazily only when required `VITE_FIREBASE_*` Web App config values exist.
- Bundle size / performance risk: Medium. Firebase is now a runtime dependency. Firestore client imports are intentionally not added to the app runtime in this phase.
- Security/privacy risk: Medium. Firebase Web App config is public client config, not a service account secret. API keys, service account JSON, AI API keys, and private tokens must remain outside the browser bundle and repository.
- Why not implement ourselves: Authentication provider flows, token issuance, anonymous auth identity, Google popup sign-in, and email/password sign-in should be delegated to a maintained identity provider rather than custom browser code.
- Scope boundary: Firestore writes remain disabled. `teacher` custom claims, classroom membership, trusted `joinClassroom`, and production submission persistence are not implemented in this phase.
- Failure policy: Missing config does not break the app; student flow can continue with browser-local temporary sessions. Configured-but-failing Auth returns student-facing messages and developer logs separately.
- Test added: `apps/workbench/src/services/firebase/firebaseAuthService.test.ts` covers missing config, anonymous sign-in success/failure, teacher Google sign-in, missing email/password input, and teacher email/password sign-in.
- Decision: adopt for Auth phase 1 only; persistence remains gated by rules tests and server-side authority design.
