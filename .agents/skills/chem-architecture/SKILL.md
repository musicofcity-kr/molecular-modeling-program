---
name: chem-architecture
description: Use when designing or revising the architecture of the ChemDraw-like educational molecule modeling app, including frontend/backend boundaries, chemistry data flow, validation gates, and phased implementation plans.
---

# Chem Architecture Skill

## Purpose

Use this skill when Codex must design, refactor, or evaluate the architecture of the Molecule Modeling Workbench.

The product is a classroom-oriented ChemDraw-like web app, not a full professional ChemDraw clone.

## Architecture Principles

1. Treat the chemical structure as data first, drawing second.
2. Keep Ketcher as the input/editor layer.
3. Keep RDKit.js as the browser validation layer.
4. Do not show calculated chemical values until validation passes.
5. Keep 3D visualization separate from 2D editing.
6. Add backend services only when browser-only implementation is insufficient.
7. Record dependency decisions in `docs/LIBRARY_DECISION_LOG.md`.

## Required Data Flow

```text
User drawing → Ketcher editor state → SMILES/Molfile → RDKit validation → results panel/export/3D viewer
```

Do not bypass this validation flow for demo convenience.

## Recommended MVP Modules

```text
src/
├─ app/
├─ components/
│  ├─ editor/
│  ├─ molecule-panel/
│  ├─ examples/
│  └─ export/
├─ chemistry/
│  ├─ structure-types.ts
│  ├─ validation-service.ts
│  ├─ rdkit-loader.ts
│  └─ examples.ts
├─ tests/
└─ styles/
```

## When Planning

Always state:

- current phase
- target user behavior
- affected files
- chemistry validation gate
- tests needed
- rollback risk

## MVP Boundaries

Allowed in MVP:

- 2D editor integration
- SMILES/Molfile extraction
- formula and molecular mass
- image export
- example molecule library

Not MVP:

- full IUPAC name generation
- quantum calculations
- publication-grade mechanism drawing
- multi-user classroom accounts
- full ChemDraw compatibility

## Output Standard

When proposing architecture, include:

1. `What changes`
2. `Why this is chemically safer`
3. `Files affected`
4. `Validation path`
5. `Test path`
