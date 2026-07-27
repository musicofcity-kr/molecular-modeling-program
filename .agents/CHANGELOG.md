# Changelog

## 2.0.0

### Added

- End-to-end molecular workbench orchestrator.
- Direct molecule construction UX skill.
- Molecular graph connectivity skill.
- Lewis structure to VSEPR bridge skill.
- Single-molecule / ionic-compound / mixture intent policy.
- Atom, bond, and connected-component acceptance criteria.
- Mandatory actual pointer and mobile/touch drawing tests.
- Linear-chain, branched-chain, disconnected-atoms, undo/redo, and multi-component fixtures.
- Release blockers for confusing 2D layout with 3D VSEPR geometry.

### Changed

- Ketcher integration now covers direct chain construction, structure-change observation, and stable adapter boundaries.
- RDKit validation now distinguishes parse validity from construction/connectivity validity.
- E2E testing no longer permits preset-only coverage for core editor acceptance.
- TDD fixtures now include graph expectations and structure intent.
- Code review rubric gives connectivity and direct drawing blocking status.
- Educational UI language now includes disconnected-structure guidance.
- 3D viewer requires explicit distinction between VSEPR ideal model, generated conformer, and curated/reference coordinates.

### Preserved

- Existing architecture, file interoperability, classroom UI, 3D viewer, validation, source-checking, TDD, E2E, and review skills remain available and were strengthened rather than discarded.
