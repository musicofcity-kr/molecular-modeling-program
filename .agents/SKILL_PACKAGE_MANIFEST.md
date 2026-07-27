# Skill Package Manifest

- Package: Molecular Modeling Workbench Skill Package
- Version: 2.0.0
- Target: Codex/ChatGPT coding workflows
- Primary application: `musicofcity-kr/molecular-modeling-program`
- Audience: Korean high-school chemistry teachers and students

## Activation Order

For substantial feature work, use skills in this order:

```text
molecular-workbench-orchestrator
  ├─ source-driven-development
  ├─ chem-architecture
  ├─ molecule-construction-ux
  ├─ ketcher-integration
  ├─ molecular-graph-connectivity
  ├─ rdkit-validation
  ├─ lewis-vsepr-bridge
  ├─ molecular-3d-viewer
  ├─ edu-chem-ui
  ├─ test-driven-development
  ├─ e2e-playwright-testing
  └─ code-review-and-quality
```

Use `chem-file-interop` whenever import/export or coordinate/file formats are involved.

## Blocking Defect Classes

A release must be blocked when any of the following is present:

- A set of disconnected atoms is reported as one successfully built molecule.
- Formula or molecular mass is shown before deterministic validation.
- Direct chain construction is not verified with actual pointer/touch interaction.
- A 2D drawing is described as the literal 3D VSEPR arrangement.
- VSEPR output is presented as experimental geometry without qualification.
- A multi-component salt/mixture policy is absent or implicit.
- Tests cover only preset loading while the product claims direct drawing support.
- The implementation depends on undocumented editor internals without a pinned-version risk note and regression test.

## Default Structure Intent

```ts
export type StructureIntent =
  | 'single-molecule'
  | 'ionic-compound'
  | 'mixture';
```

Default student free-draw mode: `single-molecule`.
