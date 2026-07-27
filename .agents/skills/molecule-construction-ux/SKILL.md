---
name: molecule-construction-ux
description: Use when implementing or reviewing direct molecule drawing, chain construction, atom/bond gestures, tool discoverability, touch behavior, undo/redo, and beginner guidance in the educational molecule editor.
---

# Molecule Construction UX Skill

## Purpose

Use this skill for the student’s actual act of constructing a molecule.

A student must not need cheminformatics knowledge to understand why placing atoms separately does not create bonds.

## Core Distinctions

The UI must distinguish:

- placing an atom
- drawing a bond from an existing atom
- drawing a repeated/linear chain
- creating a branch
- moving an atom without changing connectivity
- cleaning 2D layout
- viewing an independent VSEPR/3D model

Do not use one vague label such as “그리기” for all of these actions without contextual guidance.

## Direct Construction Requirements

1. Provide a visible beginner path for a linear carbon chain.
2. Explain that atoms placed in empty space may remain separate until bonded.
3. Provide a chain-tool path when the installed editor supports it.
4. Provide a bond-drag fallback path when chain tool discoverability is poor.
5. Show live or on-demand graph summary:
   - 원자 수
   - 결합 수
   - 연결된 구조 조각 수
6. Warn before validation when single-molecule intent contains multiple components.
7. Preserve expected behavior across mouse, pen, and touch where supported.
8. Keep undo, redo, clear, and example load synchronized with graph/result state.

## Recommended Student Guidance

```text
사슬을 만들려면 첫 원자에서 결합을 끌어 다음 원자를 연결하세요.
빈 공간에 원자를 따로 놓으면 서로 결합되지 않은 구조가 될 수 있습니다.
```

```text
현재 원자 4개가 4개의 떨어진 구조로 놓여 있습니다.
결합 도구 또는 사슬 도구로 연결해 주세요.
```

Success status:

```text
원자 4개 · 결합 3개 · 하나의 구조로 연결됨
```

## Interaction Design

- Do not depend on hover-only instructions; classrooms use touch devices.
- Keep critical tools visible or provide an app-owned quick-start control.
- Do not shrink the editor until tool labels/icons are unusable.
- At narrow widths, show a short “사슬 그리기 도움말” control.
- Use keyboard-accessible app-owned controls when possible.
- Do not intercept editor pointer events unless necessary and tested.

## Two-Dimensional Layout Boundary

“2D 구조 정리” may improve legibility of bond lengths/angles on the canvas. It must not be labelled as “전자쌍 반발 적용” or “실제 입체 구조 만들기.”

Use a separate action or panel for:

- VSEPR 예상
- 3D 구조 보기
- 쐐기/점선 입체 표기 where explicitly supported

## Required Acceptance Scenarios

Use `references/direct-drawing-acceptance.md`.

## Output Standard

When changing direct drawing UX, report:

- exact student gesture
- expected atom/bond/component counts
- mouse result
- touch/mobile result
- guidance text added or changed
- accessibility impact
- screenshots/traces or manual evidence location
