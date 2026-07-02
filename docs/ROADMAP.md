# Roadmap

## Current Implementation Status

- Completed: manual PubChem candidate search UI prototype.
- Completed: classroom activity mode MVP with local templates and RDKit result comparison.
- Completed: VSEPR educational prediction engine MVP.
- Completed: VSEPR prediction model 3D visualization MVP.
- Completed: VSEPR UI isolation as an optional classroom module, not a core free-draw workflow.
- Completed: student/teacher mode split MVP without login, persistence, dashboards, or automatic scoring.
- Completed: 3D availability pipeline stabilization for optional VSEPR gating, PubChem candidate formula compatibility checks, stale PubChem response ignoring, and Git exclusion of generated review artifacts.
- Completed: 3D Viewer representation controls and coordinate-based bond length/bond angle measurement MVP with explicit source warnings.
- Completed: actual/external 3D structure vs VSEPR educational model comparison mode with student observation prompts and teacher caution notes.
- Completed: local activity result save and JSON/Markdown/TXT/clipboard/print export MVP for Classroom MVP Release Candidate.
- Completed: official classroom terminology cleanup for the default student activity screen.
- Completed: student 3D flow stabilization for static examples, repeated confirmation, manual external 3D candidate loading, student free-draw 3D shell, and coordinate measurement visibility.
- Completed: GitHub `main` branch upload and Vercel/Firebase deployment runbook preparation.
- Completed: Firestore Security Rules design draft before enabling Firebase Auth/Firestore writes.
- Completed: Firebase Emulator rules tests for the draft Firestore Security Rules.
- Completed: Firebase Auth phase 1 with student Anonymous Auth, teacher Google/email login UI, and config-missing fallback.
- Completed: teacher custom claim UI gating and deferred joinClassroom integration point while keeping Firestore writes disabled.
- Completed: curated PubChem CID examples without static 3D coordinates now auto-request external 3D SDF after RDKit validation, while free-draw PubChem matching stays manual.
- Next: trusted joinClassroom endpoint implementation, teacher custom claim admin procedure, classroom pilot QA, accessibility polish, and teacher template authoring/import/export after the release candidate is stable.

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
- Add representation mode, atom label, reset/zoom, and coordinate-based measurement controls. (MVP complete)

## Phase 5 — Advanced Chemistry and Import/Export

- Add SDF/RXN support.
- Add PubChem search.
- Add optional FastAPI backend for Open Babel/RDKit Python.

## Phase 6 — Student Activity Integration

- Add guided tasks. (MVP complete: water, methane, ammonia, carbon dioxide, ethanol, benzene activities)
- Add VSEPR prediction prompts. (MVP complete: center atom, bonding domains, lone pairs, shape, VSEPR model observations, and 2D-vs-VSEPR reflection)
- Add student/teacher UI split. (MVP complete: simple mode switch, no auth)
- Add report export. (MVP complete: JSON, Markdown, TXT, clipboard, browser print)
- Add teacher-designed templates.
- Add local save/load. (MVP complete: latest localStorage snapshots, no server persistence)

## Phase 7 — Educational Structure Prediction

- Add RDKit-gated VSEPR prediction panel. (MVP complete)
- Add center-atom selection for multi-center molecules. (MVP complete)
- Keep VSEPR output separate from measured 3D coordinates. (MVP complete)
- Add idealized VSEPR template visualization in 3Dmol.js with explicit teaching-model labels. (MVP complete)
- Keep VSEPR hidden from the default free-draw workflow unless the user explicitly opens the optional module. (MVP complete)
- Add comparison mode between actual/external 3D coordinates and VSEPR educational prediction models. (MVP complete)
- Next: refine VSEPR model interactions only for supported guided classroom examples.

## Near-Term Next Step — Teacher Template Authoring

- Student mode is now focused on drawing, validation, prediction, reflection, and external 3D candidate review.
- Teacher mode now shows activity template information, misconception checks, validation/VSEPR/3D/PubChem status, and collapsible logs.
- Free-draw student mode now treats VSEPR as an optional education module rather than a permanent core panel.
- Classroom MVP RC now supports local activity-result snapshots and JSON/Markdown/TXT/clipboard/print export without login or a database.
- Firebase/Firestore server storage remains disabled even though draft rules now have emulator coverage.
- Next teacher-facing step: custom claim issuance/revocation workflow, trusted classroom join endpoint, then local template editing/import/export after the mode split is stable.
- Keep server storage, login, dashboards, automatic grading, PDF export, and 3D viewer capture out of scope until the classroom flow is stable.
