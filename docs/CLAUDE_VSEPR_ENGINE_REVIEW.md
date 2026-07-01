# Claude VSEPR Engine Intake Review

Source files reviewed:

- `vsepr-engine.js`
- `분자구조_VSEPR_시뮬레이터.html`

Review date: 2026-06-30

## Summary

Claude's prototype provides a useful standalone VSEPR classroom simulator with
13 standard AXE examples, a canvas viewer, and a repulsion-energy relaxation
demo. 다양한 분자의 분자구조 모델링 cannot import it wholesale because this
project keeps RDKit.js validation, VSEPR prediction, actual 3D coordinate
rendering, and educational template rendering as separate layers.

## Applied Changes

The following items were extracted and adapted:

- Added support for additional classroom center atoms from the Claude preset
  set: Be, B, and Xe.
- Kept existing P, S, Cl, Br support and added regression coverage for the
  full classroom preset group:
  - BeCl2: AX2, linear
  - BF3: AX3, trigonal planar
  - PCl5: AX5, trigonal bipyramidal
  - SF4: AX4E, seesaw
  - ClF3: AX3E2, T-shaped
  - XeF2: AX2E3, linear
  - SF6: AX6, octahedral
  - BrF5: AX5E, square pyramidal
  - XeF4: AX4E2, square planar
- Added a center-atom auto-selection rule for structures with one clear center
  atom and terminal heavy-atom ligands.
- Added compatibility for Claude-style AX notation aliases:
  - `AX4E0` -> `AX4`
  - `AX3E1` -> `AX3E`
  - `AX6E0` -> `AX6`

## Not Applied

The following Claude prototype behaviors were intentionally not imported:

- Repulsion-energy minimization as the production VSEPR engine.
- Canvas-based standalone rendering layer.
- Experimental bond-angle values as authoritative student-facing data.
- Polarity classification based only on vector sum and identical terminal atom
  assumptions.

Reasons:

- The workbench policy states that VSEPR output is an educational prediction,
  not an optimized geometry or experimental source.
- Earlier project requirements explicitly blocked energy minimization and real
  bond-angle calculation in this MVP.
- RDKit.js remains the validation and formula/mass source.
- 3Dmol.js remains a renderer, not a chemistry validator or conformer generator.

## Current Integration Boundary

The workbench now uses Claude's prototype as a reference for classroom coverage,
not as a runtime dependency.

Production flow remains:

```text
Ketcher 2D structure
  -> RDKit.js validation
  -> VSEPR engine local AXE prediction
  -> VSEPR template vectors
  -> 3Dmol.js educational model rendering
```

## Verification

Added or updated tests:

- `apps/workbench/src/services/vseprEngine.test.ts`
- `apps/workbench/src/services/vseprGeometryTemplates.test.ts`

Latest targeted result:

```text
npm test -- --run src/services/vseprEngine.test.ts src/services/vseprGeometryTemplates.test.ts
2 files passed, 14 tests passed
```
