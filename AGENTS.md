# AGENTS.md — Molecule Modeling Workbench

## Project Goal

Build a ChemDraw-like educational molecule modeling web app for high-school chemistry instruction.
The goal is not to clone ChemDraw completely. The goal is to create a reliable classroom-oriented molecular structure editor and viewer.

## Core Product Definition

The app should support:

1. 2D molecule and reaction drawing through an embedded chemical editor.
2. Machine-readable structure extraction such as SMILES and Molfile.
3. Deterministic validation of chemical structures before displaying calculated results.
4. Basic calculated outputs: molecular formula, molecular weight, valence warnings, and canonical SMILES.
5. 2D image export for worksheets.
6. 3D molecular visualization for classroom explanation.
7. Teacher-oriented templates and example molecules.

## Preferred Stack

- Frontend: React + Vite + TypeScript
- 2D editor: Ketcher
- Chemistry validation: RDKit.js first, optional RDKit Python backend later
- 3D viewer: 3Dmol.js
- Testing: Vitest + Playwright
- Deployment: start as browser-first static app; add backend only if required

## Non-negotiable Chemistry Rules

- Do not invent molecular structures from uncertain names without verification.
- Do not trust LLM-generated SMILES unless validated by a chemistry toolkit.
- Treat OCR, screenshot, and ambiguous text recognition as untrusted input.
- Any calculated chemical result must show its source structure string or validation status.
- If RDKit/Ketcher disagree, block the result and ask for human review.
- Do not present 3D conformer geometry as experimentally measured geometry unless a source or method is explicitly provided.

## Codex Workflow Rules

- For complex changes, plan before coding.
- Before adding a production dependency, explain why it is needed and whether it affects licensing or deployment.
- Prefer small increments. One feature should include implementation, tests, and a short verification note.
- After changing TypeScript/React code, run or propose: `npm run lint`, `npm run typecheck`, and relevant tests.
- Do not remove validation gates to make demos work.
- Keep education use cases visible. UI decisions should support teacher/student classroom use, not only developer convenience.

## Definition of Done

A feature is done only when:

- It has a clear user-facing behavior.
- It has validation for invalid or ambiguous molecule inputs.
- It has at least one test or a documented manual verification path.
- It does not break existing example molecules.
- It updates docs when behavior changes.

## Relevant Skills

Use these skills when appropriate:

- `chem-architecture` for architecture, data flow, and stack decisions.
- `ketcher-integration` for 2D structure editor work.
- `rdkit-validation` for molecule validation and chemistry calculations.
- `molecular-3d-viewer` for 3Dmol.js and 2D-to-3D viewing.
- `chem-file-interop` for SMILES, MOL, SDF, RXN, XYZ, PDB import/export.
- `edu-chem-ui` for teacher/student classroom UX.
- `source-driven-development` when selecting libraries or checking docs.
- `test-driven-development` for feature implementation.
- `code-review-and-quality` before accepting large diffs.
- `e2e-playwright-testing` for editor workflows.
