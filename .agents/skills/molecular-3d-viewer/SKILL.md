---
name: molecular-3d-viewer
description: Use when adding or reviewing 3D molecular visualization with 3Dmol.js or related WebGL tools, including viewer initialization, coordinate source labeling, 2D-to-3D handoff, rendering modes, and classroom interpretation warnings.
---

# Molecular 3D Viewer Skill

## Purpose

Use this skill for 3D molecular visualization.

The 3D viewer is an interpretation aid, not the primary chemical validation layer.

## Phase Rule

Do not implement advanced 3D workflows before the 2D editor and RDKit validation are stable.

## Required Viewer Labels

Every 3D view must indicate the source/method of coordinates:

- 예제 내장 3D 구조
- PubChem 제공 구조
- RDKit/Open Babel 생성 conformer
- 사용자가 가져온 파일
- 검토 필요

## Recommended Component Boundary

```ts
export type Molecule3DInput = {
  format: 'sdf' | 'mol' | 'pdb' | 'xyz';
  data: string;
  label: string;
  coordinateSource: string;
};
```

## Do Not

- Do not imply generated conformers are experimentally measured.
- Do not use 3D coordinates to override failed 2D validation.
- Do not add heavy 3D optimization to the frontend MVP.
- Do not make the 3D viewer block the 2D editor.

## Classroom Modes

Useful presets:

- stick: 기본 결합 구조
- sphere: 원자 크기 강조
- ball-and-stick: 학생 설명용 기본값
- surface: 고급/선택 기능

## Test Cases

- viewer initializes on example molecule
- viewer clears previous molecule before loading a new one
- invalid or missing coordinates show a friendly message
- viewer does not crash on mobile-width layout

## Output Standard

When changing 3D code, include:

- input format
- coordinate source
- rendering mode
- fallback behavior
- classroom warning text if needed
