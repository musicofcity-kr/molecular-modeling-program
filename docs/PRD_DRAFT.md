# PRD Draft — ChemDraw-like Educational 다양한 분자의 분자구조 모델링

> **2026-07-12 범위 결정:** 학생 기본 경험은 분자 선택, 구조 편집, 검증,
> 3D/VSEPR 보기의 직접 작업 화면이다. 별도 예측·다중 성찰·단계 진행·결과
> 보고서는 제외한다. 단, 예상 입체 모형 아래 단일 생각 정리 입력과 검증 후
> 교사 제출은 포함한다.

## 1. Product Summary

A browser-based molecule modeling workbench for high-school chemistry instruction. Teachers and students can draw molecules, inspect molecular data, export classroom-ready images, and compare 2D structural formulas with 3D molecular models.

## 2. Target Users

- High-school chemistry teachers
- High-school students learning molecular structure, bonding, polarity, isomerism, and organic functional groups
- Science club or inquiry students preparing reports

## 3. Problem

Existing professional tools such as ChemDraw are powerful but not always accessible, affordable, or classroom-workflow-friendly. General drawing tools cannot validate chemical structures. Students need a tool that makes chemical structure drawing, validation, and conceptual interpretation visible.

## 4. Product Goals

### MVP Goals

- Embed a reliable 2D chemical structure editor.
- Extract SMILES and Molfile from the drawn structure.
- Validate drawn structures with deterministic chemistry tooling.
- Calculate molecular formula and molecular weight.
- Export 2D structure image for worksheets.
- Provide a starter example molecule library.

### Extension Goals

- Add 3D molecular viewer.
- Add functional-group tagging.
- Add polarity and geometry teaching overlays.
- Add teacher template mode.
- Add student worksheet/report export.

## 5. MVP Feature List

| Feature | User Story | Validation |
|---|---|---|
| 2D drawing canvas | As a teacher/student, I can draw a molecule using atoms, bonds, rings, and charges. | Ketcher loads, editor state is retrievable. |
| Structure extraction | I can export SMILES and Molfile. | Output passes RDKit parse check. |
| Formula/mass | I can see molecular formula and molecular weight. | Values come from validated structure only. |
| Image export | I can export PNG/SVG for worksheets. | Export works for example molecules. |
| Example library | I can load water, methane, ethanol, acetic acid, benzene, glucose, aspirin. | All examples validate. |
| Invalid structure warning | I receive an understandable warning if a structure is chemically invalid. | Invalid test inputs are blocked. |

## 6. Non-goals for MVP

- Full ChemDraw replacement
- Publication-grade mechanism arrow editing
- Full IUPAC name generation
- Quantum chemistry calculations
- Full 3D conformer energy minimization
- Student account system

## 7. Classroom Use Cases

1. 분자식과 구조식의 관계 설명
2. 이성질체 구조 비교
3. 벤젠과 방향족 구조 표현
4. 작용기 찾기
5. 분자량 계산 연습
6. 극성/무극성 판단 전 3D 구조 관찰
7. 유기 반응식 기초 표현

## 8. Success Criteria

- A novice student can draw ethanol and see correct molecular formula and molecular mass.
- A teacher can export a clean SVG/PNG for a worksheet.
- Invalid structures do not produce confident false outputs.
- At least 7 example molecules pass automated validation.
- The app can run locally and be deployed as a static web app for MVP.
