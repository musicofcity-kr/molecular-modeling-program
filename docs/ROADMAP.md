# Roadmap

## Current Implementation Status

- Completed: manual PubChem candidate search UI prototype.
- Completed: classroom activity mode MVP with local templates and RDKit result comparison.
- Completed: VSEPR educational prediction engine MVP.
- Completed: VSEPR prediction model 3D visualization MVP.
- Completed: VSEPR UI isolation as an optional classroom module, not a core free-draw workflow.
- Completed: student/teacher mode split MVP without login, persistence, dashboards, or automatic scoring.
- Next: keep the core free-draw MVP focused on Ketcher -> RDKit.js -> actual/external 3D, while refining VSEPR only inside guided classroom activities or explicit optional use.

## Phase 0 — Skill and Workspace Setup

- Install this skill package.
- Create React/Vite/TypeScript workspace.
- Confirm Codex loads AGENTS.md and skills.

## Phase 1 — 2D Structure MVP

- Embed Ketcher.
- Add example molecule loader.
- Extract SMILES and Molfile.
- Render current structure preview.

## Phase 2 — RDKit Validation

- Initialize RDKit.js.
- Validate SMILES/Molfile.
- Compute formula and molecular weight.
- Add invalid structure warnings.

## Phase 3 — Export and Classroom Mode

- Export SVG/PNG.
- Add teacher example library.
- Add Korean UI labels.
- Add worksheet image mode.

## Phase 4 — 3D Viewer

- Add 3Dmol.js viewer.
- Load known 3D example structures first.
- Add method/source labels.
- Add geometry explanation panel.

## Phase 5 — Advanced Chemistry and Import/Export

- Add SDF/RXN support.
- Add PubChem search.
- Add optional FastAPI backend for Open Babel/RDKit Python.

## Phase 6 — Student Activity Integration

- Add guided tasks. (MVP complete: water, methane, ammonia, ethanol, benzene activities)
- Add VSEPR prediction prompts. (MVP complete: center atom, bonding domains, lone pairs, shape, VSEPR model observations, and 2D-vs-VSEPR reflection)
- Add student/teacher UI split. (MVP complete: simple mode switch, no auth)
- Add report export.
- Add teacher-designed templates.
- Add local save/load.

## Phase 7 — Educational Structure Prediction

- Add RDKit-gated VSEPR prediction panel. (MVP complete)
- Add center-atom selection for multi-center molecules. (MVP complete)
- Keep VSEPR output separate from measured 3D coordinates. (MVP complete)
- Add idealized VSEPR template visualization in 3Dmol.js with explicit teaching-model labels. (MVP complete)
- Keep VSEPR hidden from the default free-draw workflow unless the user explicitly opens the optional module. (MVP complete)
- Next: refine VSEPR model interactions only for supported guided classroom examples.

## Near-Term Next Step — Teacher Template Authoring

- Student mode is now focused on drawing, validation, prediction, reflection, and external 3D candidate review.
- Teacher mode now shows activity template information, misconception checks, validation/VSEPR/3D/PubChem status, and collapsible logs.
- Free-draw student mode now treats VSEPR as an optional education module rather than a permanent core panel.
- Next teacher-facing step: local template editing/import/export after the mode split is stable.
- Keep storage, login, dashboards, automatic grading, and export out of scope until the classroom flow is stable.
