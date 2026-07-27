---
name: chem-architecture
description: Use when designing or revising the educational molecule modeling app architecture, including editor adapters, graph/connectivity gates, RDKit validation, VSEPR boundaries, 3D provenance, and phased implementation plans.
---

# Chem Architecture Skill

## Purpose

Use this skill when designing, refactoring, or evaluating the Molecule Modeling Workbench.

The product is a classroom-oriented molecular modeling app, not a full professional ChemDraw clone.

## Architecture Principles

1. Treat chemical structure as a graph first and a drawing second.
2. Treat student construction intent as explicit state.
3. Keep Ketcher as the input/editor layer behind an app-owned adapter.
4. Inspect atom/bond/component connectivity before reporting construction success.
5. Keep RDKit.js as the deterministic chemistry validation layer.
6. Do not show calculated chemistry values until connectivity policy and RDKit validation pass.
7. Keep 2D layout, VSEPR interpretation, and coordinate-based 3D visualization separate.
8. Add backend services only when browser-only implementation is insufficient.
9. Record dependency/API decisions in `docs/LIBRARY_DECISION_LOG.md`.
10. Make direct mouse/touch drawing a product capability, not an untested assumption.

## Required Data Flow

```text
Student gesture
→ Ketcher adapter state
→ SMILES/Molfile or graph representation
→ graph summary
→ structure-intent policy
→ RDKit validation
→ result panel/export
→ local VSEPR analysis
→ separately labelled 3D viewer
```

Do not bypass graph or RDKit gates for demo convenience.

## Recommended Module Boundaries

```text
src/
├─ app/
├─ components/
│  ├─ editor/
│  ├─ connectivity/
│  ├─ validation/
│  ├─ vsepr/
│  ├─ molecule-panel/
│  ├─ examples/
│  └─ export/
├─ chemistry/
│  ├─ structure-types.ts
│  ├─ graph-summary.ts
│  ├─ connectivity-policy.ts
│  ├─ validation-service.ts
│  ├─ rdkit-loader.ts
│  ├─ vsepr-service.ts
│  └─ examples.ts
├─ e2e/
├─ tests/
└─ styles/
```

Adapt paths to the current repository rather than moving files unnecessarily.

## Required Domain Types

The architecture must represent equivalents of:

- `StructureIntent`
- `MoleculeGraphSummary`
- `ConnectivityDecision`
- `MoleculeValidationResult`
- `VseprAnalysis`
- `Molecule3DInput` with coordinate provenance

## Planning Standard

Always state:

- current phase and baseline
- target user behavior
- exact reproduction path
- affected files
- graph/connectivity gate
- chemistry validation gate
- VSEPR/3D boundary
- tests needed
- rollback risk

## MVP Boundaries

Allowed in MVP:

- direct 2D editor integration
- linear and branched chain construction
- graph/connectivity summary
- SMILES/Molfile extraction
- formula and molecular mass
- local-center VSEPR prediction
- labelled 3D reference/model viewer
- image export
- example molecule library

Not automatically MVP:

- full IUPAC name generation
- quantum calculations
- publication-grade mechanisms
- full ChemDraw compatibility
- unsupported transition-metal geometry

## Output Standard

Include:

1. What changes
2. Why this is chemically and pedagogically safer
3. Files affected
4. Connectivity/validation path
5. Direct drawing and test path
6. Remaining unsupported cases
