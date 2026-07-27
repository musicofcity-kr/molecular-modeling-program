# PRD Draft — ChemDraw-like Educational 다양한 분자의 분자구조 모델링

> **2026-07-27 현재 범위 addendum:** 루트
> `CODEX 분자구조모델링 메타프롬프트.md`의 UX·QA 계약이 현재 우선순위다.
> 학생 기본 경험은 잠금 없는
> `분자 선택 → 구조 만들기 → 구조 분석 → 3D 비교 → 생각 정리·제출`
> 5단계이며, 데스크톱 진행 레일과 모바일 5탭을 제공한다.
>
> **2026-07-12 범위 결정 — SUPERSEDED 2026-07-27:** 단계 진행 UI가 없는
> 직접 작업대와 단일 생각 입력을 현재 계약으로 삼았던 결정이다. 이력과
> 레거시 데이터 호환 설명을 위해 보존하지만 신규 UI 요구사항으로 사용하지
> 않는다.

현재 제품 상태는 `unreleased release candidate / 로컬 QA 95점`이다.
production 배포 완료나 학교 운영 승인은 이 문서에서 주장하지 않는다.

## 1. Product Summary

A browser-based molecule modeling workbench for high-school chemistry
instruction. Students draw or load a 2D structure, pass deterministic
validation, inspect VSEPR evidence, compare a source-labeled reference 3D
structure with an educational prediction model, record their reasoning, and
submit it for teacher feedback.

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
- Provide an unlocked five-stage student learning flow and compact mobile tabs.
- Provide simple and advanced Ketcher editing modes without losing the structure.
- Display VSEPR evidence separately from reference 3D coordinate data.
- Support guarded student submission and teacher-returned formative feedback.

### Later Goals

- Add functional-group tagging.
- Add polarity teaching overlays beyond the current VSEPR evidence.
- Complete teacher-configurable classroom focus mode.
- Expand worksheet/report export without exposing raw technical data to students.

## 5. MVP Feature List

| Feature | User Story | Validation |
|---|---|---|
| 2D drawing canvas | As a teacher/student, I can draw a molecule using atoms, bonds, rings, and charges. | Ketcher loads, editor state is retrievable. |
| Structure extraction | I can export SMILES and Molfile. | Output passes RDKit parse check. |
| Formula/mass | I can see molecular formula and molecular weight. | Values come from validated structure only. |
| Image export | I can export PNG/SVG for worksheets. | Export works for example molecules. |
| Example library | I can load water, methane, ethanol, acetic acid, benzene, glucose, aspirin. | All examples validate. |
| Invalid structure warning | I receive an understandable warning if a structure is chemically invalid. | Invalid test inputs are blocked. |
| Five-stage learning flow | I can move freely among molecule selection, drawing, analysis, 3D comparison, and reflection/submission. | Current/completed/review/error states reflect real activity state; no stage lock. |
| Simple/advanced editor | I can start with essential tools and open the full editor when needed. | Mode switch preserves the current structure. |
| VSEPR evidence table | I can distinguish the central atom, bonding/lone-pair/total electron domains, electron geometry, molecular shape, and predicted angle. | Runs only after RDKit validation and blocks unsupported cases. |
| 3D comparison | I can distinguish source-based reference coordinates from the idealized VSEPR model. | The two viewers have separate labels, controls, and caveats. |
| Student submission/feedback | I can submit reasoning after prerequisites pass and read returned teacher feedback. | Requires a valid structure, non-empty reasoning, joined Firebase classroom, and ID token. |
| Mobile navigation | I can use the five stages at 390 px without horizontal overflow. | `선택·그리기·분석·3D·기록` controls remain keyboard/touch accessible. |

## 6. Non-goals for MVP

- Full ChemDraw replacement
- Publication-grade mechanism arrow editing
- Full IUPAC name generation
- Quantum chemistry calculations
- Full 3D conformer energy minimization
- Real-name/student-number account profile system

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
- A novice student can identify the current stage and move among all five stages without a lock.
- Water, methane, ammonia, and carbon dioxide show the correct center-local VSEPR evidence or an explicit supported-state limitation.
- Reference 3D coordinates and the VSEPR educational model are never presented as the same source.
- Student submission stays disabled until validation, reasoning, trusted classroom join, and token gates pass.
- Explicit trusted-endpoint 4xx classroom rejections keep the student on the entry screen; 5xx/network failures preserve the documented local/deferred recovery path.
- Final release status remains pending until typecheck, unit, build, E2E, mobile, accessibility, and live-environment checks are rerun together.
