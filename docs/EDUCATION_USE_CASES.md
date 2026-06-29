# Education Use Cases — Molecule Modeling Workbench

Date: 2026-06-30

## Purpose

The example molecule library lets students start from verified classroom molecules instead of drawing every structure from a blank Ketcher canvas. Students can load an example, inspect the structure, modify it in Ketcher, and run the same RDKit.js validation path used for hand-drawn structures.

## Current Example Library

| Group | Molecule | SMILES | Formula metadata | Teaching use |
|---|---|---|---|---|
| 기본 분자 | 물 | `O` | `H2O` | 공유 결합과 굽은형 분자 구조 |
| 기본 분자 | 메테인 | `C` | `CH4` | 탄소의 네 결합과 기본 유기 분자 |
| 기본 분자 | 암모니아 | `N` | `H3N` | 비공유 전자쌍과 삼각뿔형 구조 |
| 기본 분자 | 이산화탄소 | `O=C=O` | `CO2` | 이중 결합과 직선형 구조 |
| 유기 기초 | 에탄올 | `CCO` | `C2H6O` | 하이드록시기와 생활 속 유기 분자 |
| 유기 기초 | 아세트산 | `CC(=O)O` | `C2H4O2` | 카복실기와 산성 물질 예시 |
| 유기 기초 | 벤젠 | `c1ccccc1` | `C6H6` | 방향족 고리와 결합 표현 |
| 생활 속 분자 | 포도당 | `C(C1C(C(C(C(O1)O)O)O)O)O` | `C6H12O6` | 탄수화물과 생명 현상 속 분자 |
| 생활 속 분자 | 아스피린 | `CC(=O)Oc1ccccc1C(=O)O` | `C9H8O4` | 의약품 분자와 작용기 찾기 |

Formula metadata is checked against RDKit.js validation tests. The student-facing result panel still displays only RDKit-validated formula and average molecular weight.

## Classroom Flow

1. Teacher chooses an example molecule from the top example selector.
2. Student clicks `예제 불러오기`.
3. The app loads the example SMILES into Ketcher.
4. The app extracts the structure from Ketcher and runs the existing RDKit.js validation flow.
5. If validation succeeds, the student panel shows:
   - canonical SMILES
   - molecular formula
   - average molecular weight from RDKit descriptor `amw`
6. Student modifies the structure in Ketcher and clicks `구조 검증하기` again.

## Suggested Lessons

### 1. Basic Molecule Shape Discussion

- Use: 물, 메테인, 암모니아, 이산화탄소
- Teacher focus: compare simple bonding patterns and introduce that the current MVP validates 2D structure strings, not 3D geometry.
- Misconception guard: do not infer bond angle or full 3D shape from this MVP yet.

### 2. Functional Group Introduction

- Use: 에탄올, 아세트산, 아스피린
- Teacher focus: identify `-OH`, `-COOH`, ester, and aromatic ring patterns from the editable 2D structure.
- Student action: load a molecule, modify a small part, and re-run validation.

### 3. Formula and Average Molecular Weight Check

- Use: 에탄올, 벤젠, 포도당
- Teacher focus: compare manually counted formula with RDKit-validated formula.
- Safety rule: if RDKit validation fails, formula and molecular weight remain hidden.

## Current Boundaries

- 3Dmol.js is not integrated yet.
- PubChem lookup is not integrated yet.
- Example molecules are static local records, not external database results.
- Molecular weight means RDKit descriptor `amw` average molecular weight; exact mass is not displayed.
- The formulas in `src/data/exampleMolecules.ts` are metadata and must stay aligned with RDKit validation tests.
