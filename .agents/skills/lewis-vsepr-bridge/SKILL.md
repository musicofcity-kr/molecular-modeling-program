---
name: lewis-vsepr-bridge
description: Use when connecting 2D/Lewis structures to local VSEPR predictions, lone-pair reasoning, AXE notation, central-atom selection, ideal geometry, and misconception-safe classroom explanations.
---

# Lewis–VSEPR Bridge Skill

## Purpose

Use this skill to translate a validated connectivity graph into an educational VSEPR interpretation without confusing a 2D drawing with literal 3D molecular geometry.

## Non-Negotiable Boundary

- The 2D editor records atoms, bonds, charges, stereochemical annotations, and drawing coordinates.
- VSEPR predicts electron-domain geometry and molecular shape around a selected central atom.
- A 2D clean/layout command improves readability; it does not physically apply electron-pair repulsion.
- A 3D viewer or explicit wedge/dash representation is required to communicate spatial arrangement.

Never label a 2D layout operation as “VSEPR 적용,” “전자쌍 반발 완료,” or “실제 입체 구조.”

## Required Analysis Flow

```text
validated atom/bond graph
→ candidate central atoms
→ selected local center
→ explicit and inferred ligands
→ formal charge/valence checks
→ lone-pair estimate
→ steric number
→ AXE notation
→ electron-domain geometry
→ molecular shape
→ confidence and limitations
```

## Local-Center Rule

For chains and molecules with multiple non-terminal atoms:

- Do not assign one global VSEPR shape to the entire molecule.
- Require selection of a local center or iterate center by center.
- Label atoms clearly, e.g. `C1`, `C2`, `O3`.
- Explain that conformational shape of a chain is not equivalent to one-center VSEPR classification.

## Angle Data Model

Keep these separate:

```ts
export type GeometryAngleEvidence = {
  vseprIdealAngles: string[];
  generatedCoordinateMeasurements?: number[];
  curatedReferenceAngles?: Array<{
    value: number;
    unit: 'degree';
    sourceLabel: string;
  }>;
};
```

Do not replace an ideal range such as `<109.5°` with a specific reference value unless the source and meaning are explicit.

## Confidence Rules

Lower confidence or mark unsupported for:

- radicals
- resonance/aromatic simplification that affects electron accounting
- transition metals or unsupported valence patterns
- ambiguous formal charge
- hypervalent structures outside the tested model
- missing stereochemistry when spatial claims depend on it

## Classroom Presentation

Recommended three-part presentation:

1. `2D 구조식`: what is connected to what.
2. `전자 영역 예상`: bonded domains and lone pairs around the selected center.
3. `VSEPR 입체 모형`: idealized spatial model with limitations.

Recommended warning:

```text
2D 구조식은 원자의 연결 관계를 나타냅니다. 아래 VSEPR 모형은 선택한 중심 원자 주변의 이상적인 입체 배치를 따로 나타낸 것입니다.
```

## Required Regression Set

- CO2: AX2, linear.
- BF3: AX3, trigonal planar.
- CH4: AX4, tetrahedral.
- NH3: AX3E, trigonal pyramidal.
- H2O: AX2E2, bent.
- SO2: AX2E with explicit limitations.
- Ethanol-like chain: require local-center selection.
- Unsupported/ambiguous structure: no confident geometry.

## Output Standard

Report:

- selected center
- electron-domain count
- lone-pair count and inference source
- AXE notation
- ideal model
- confidence/limitations
- distinction from 2D layout and coordinate-based 3D
