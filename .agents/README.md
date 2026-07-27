# Molecular Modeling Workbench Skill Package v2.0

This package is a Codex/ChatGPT-compatible collection of project skills for building and maintaining a Korean high-school educational molecular modeling workbench.

Version 2.0 corrects a major weakness of the original package: a structure that can be parsed is not automatically a successfully constructed molecule. The package now treats **direct drawing usability, graph connectivity, and the separation of 2D notation from VSEPR 3D prediction** as first-class acceptance criteria.

## Core Product Principle

```text
Student intent
→ direct 2D construction
→ editor extraction
→ graph/connectivity inspection
→ RDKit validation
→ chemistry result gating
→ local VSEPR interpretation
→ separately labelled 3D model
```

No phase may skip graph/connectivity inspection merely because RDKit can parse the input.

## Skill Map

Start with `molecular-workbench-orchestrator` for substantial work. It routes work to the specialist skills.

| Skill | Responsibility |
|---|---|
| molecular-workbench-orchestrator | End-to-end workflow and completion gates |
| chem-architecture | Boundaries and chemistry data flow |
| molecule-construction-ux | Direct drawing, chain building, mouse/touch usability |
| ketcher-integration | Stable editor adapter and Ketcher integration |
| molecular-graph-connectivity | Atom/bond/component analysis and intent policy |
| rdkit-validation | Deterministic structure validation and result gating |
| lewis-vsepr-bridge | Lewis/2D/VSEPR conceptual boundary and local geometry |
| molecular-3d-viewer | 3D visualization and coordinate provenance |
| edu-chem-ui | Classroom language and misconception prevention |
| chem-file-interop | Chemical import/export boundaries |
| test-driven-development | Regression-first implementation |
| e2e-playwright-testing | Actual browser interaction and direct drawing tests |
| code-review-and-quality | Blocking review and release rubric |
| source-driven-development | Primary-source verification for libraries/APIs |

## Mandatory Completion Gates

A molecule editor change is not complete unless all applicable gates pass:

1. The editor loads and exposes only an app-owned adapter.
2. A student can directly create a linear carbon chain without loading a preset.
3. The app reports atom count, bond count, and connected-component count.
4. Disconnected atoms are not silently accepted as one molecule.
5. Multi-component structures are allowed only under an explicit activity intent.
6. RDKit validation gates formula, mass, canonical structure, and downstream viewers.
7. 2D layout is not presented as literal VSEPR geometry.
8. VSEPR is calculated per selected local center and labelled as a model.
9. At least one real mouse/pointer path and one touch/mobile path are verified.
10. Unit, integration, E2E, typecheck, and production build commands are reported.

See `SKILL_PACKAGE_MANIFEST.md` for routing and `CHANGELOG.md` for changes from v1.
