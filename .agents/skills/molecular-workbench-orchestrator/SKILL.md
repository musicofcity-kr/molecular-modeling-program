---
name: molecular-workbench-orchestrator
description: Use for any substantial feature, refactor, bug fix, or release of the educational molecule modeling workbench; coordinates direct drawing, connectivity, RDKit validation, VSEPR, 3D, classroom UX, testing, and release gates.
---

# Molecular Workbench Orchestrator

## Purpose

Use this as the primary entry skill for substantial work on the molecule modeling application.

The central rule is:

> A parseable structure is not necessarily a successfully constructed molecule.

The workflow must preserve student intent from drawing through validation and interpretation.

## Required Workflow

1. **Restate the user-observable problem.**
   - Example: “Dragging a carbon chain creates separate atoms instead of one connected chain.”
2. **Reproduce before changing code.**
   - Record browser, viewport, input method, editor version, selected tool, exact gestures, and extracted SMILES/Molfile.
3. **Check primary sources.**
   - Verify the exact editor and RDKit APIs for the installed versions.
4. **Classify the structure intent.**
   - `single-molecule`, `ionic-compound`, or `mixture`.
5. **Write a failing test.**
   - Prefer a graph-level regression plus a browser interaction regression.
6. **Implement through app-owned adapters.**
   - Do not leak raw Ketcher APIs across the application.
7. **Inspect connectivity before chemistry output.**
   - Atom count, bond count, connected-component count.
8. **Run deterministic validation.**
   - RDKit parsing/sanitization, formula, mass, canonical representation.
9. **Run local VSEPR interpretation where applicable.**
   - Per selected central atom; do not claim whole-molecule geometry for multi-center chains.
10. **Render 3D separately and label provenance.**
11. **Verify direct use.**
   - Actual pointer chain, disconnected atoms, branch, undo/redo, touch/mobile.
12. **Run release gates and report evidence.**

## Mandatory Architecture Flow

```text
Student action
→ editor adapter
→ extracted structure
→ graph summary
→ structure-intent policy
→ RDKit validation
→ results
→ local VSEPR model
→ separately sourced 3D view
```

Do not reorder this to show confident chemistry results before connectivity and RDKit gates.

## Definition of Done

For editor/construction changes, all applicable criteria in `references/definition-of-done.md` must pass. A preset-only E2E is insufficient.

## Cross-Skill Routing

- Architecture/data flow: `chem-architecture`
- Direct drawing and chain UX: `molecule-construction-ux`
- Ketcher wrapper/API: `ketcher-integration`
- Graph/component policy: `molecular-graph-connectivity`
- Chemistry validation: `rdkit-validation`
- Lewis/VSEPR: `lewis-vsepr-bridge`
- 3D rendering: `molecular-3d-viewer`
- Classroom language: `edu-chem-ui`
- Tests: `test-driven-development`, then `e2e-playwright-testing`
- Final acceptance: `code-review-and-quality`

## Stop Conditions

Do not declare completion when:

- Direct drawing was not reproduced.
- Only example loading was tested.
- Disconnected atoms can pass as one single molecule.
- Ketcher private DOM/state is used without version pinning and regression evidence.
- VSEPR and 2D layout are conflated.
- The report says tests pass without naming commands and scenarios.

## Output Standard

Report:

1. Problem reproduced
2. Root cause by layer: skill/spec, editor interaction, graph policy, chemistry engine, UI, tests
3. Files changed
4. Tests added
5. Commands and results
6. Remaining uncertainty
7. Rollback path
