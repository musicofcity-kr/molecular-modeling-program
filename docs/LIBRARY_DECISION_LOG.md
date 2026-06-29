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

### Open Babel

- Purpose: optional backend conversion for chemical file formats.
- Decision: not MVP unless import/export requirements demand it.
- Risk: server-side dependency complexity.

### PubChem PUG-REST

- Purpose: name/compound lookup.
- Decision: Phase 5 candidate.
- Risk: external API dependence and classroom network reliability.
