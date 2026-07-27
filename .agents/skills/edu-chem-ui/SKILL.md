---
name: edu-chem-ui
description: Use when designing or reviewing Korean high-school chemistry UI/UX, including direct drawing guidance, connectivity status, validation, 2D/VSEPR/3D distinctions, teacher/student modes, warnings, and misconception prevention.
---

# Educational Chemistry UI Skill

## Purpose

Use this skill for UI text, layout, examples, and classroom workflows.

Accuracy, clarity, and misconception prevention matter more than visual novelty.

## UI Principles

1. Make the direct construction action understandable to beginners.
2. Show structure connectivity before calculated results.
3. Keep validation status visible.
4. Use Korean high-school chemistry language, not raw cheminformatics jargon.
5. Separate teacher explanations from student labels.
6. Warn whenever a model or inference is simplified.
7. Distinguish 2D structure, connectivity, local VSEPR model, and coordinate-based 3D.
8. Do not rely on hover-only help; support touch/projector contexts.

## Recommended Workbench Layout

```text
[상단] 분자/활동 선택 · 구조 의도 · 초기화
[좌측] 2D 구조식 편집기 · 사슬 그리기 도움말
[우측 상단] 원자/결합/연결 조각 상태 · 구조 검증
[우측 하단] 분자식/분자량/검증 결과
[하단] 선택 중심 원자 VSEPR · 별도 3D 구조 보기 · 학생 생각
```

## Required Student Status Language

Connected:

```text
원자 4개 · 결합 3개 · 하나의 구조로 연결됨
```

Disconnected:

```text
현재 구조가 여러 조각으로 나뉘어 있습니다. 하나의 분자를 만들려면 원자 사이를 결합으로 연결해 주세요.
```

Construction help:

```text
사슬을 만들려면 첫 원자에서 결합을 끌어 다음 원자를 연결하세요. 빈 공간에 원자를 따로 놓으면 서로 결합되지 않을 수 있습니다.
```

2D/VSEPR boundary:

```text
2D 구조식은 원자의 연결 관계를 나타냅니다. VSEPR 모형은 선택한 중심 원자 주변의 이상적인 입체 배치를 따로 보여 줍니다.
```

3D warning:

```text
이 3D 구조는 개념 이해를 위한 모델입니다. 좌표의 출처와 생성 방법에 따라 실제 구조와 차이가 있을 수 있습니다.
```

## Structure Intent UI

Do not expose technical labels alone. Suggested student-facing labels:

- `하나의 분자 그리기` → `single-molecule`
- `이온으로 이루어진 물질` → `ionic-compound`
- `여러 물질 함께 보기` → `mixture`

The teacher/activity template should normally preconfigure intent so students do not need to decide it.

## Result Ordering

1. Editor ready/construction help
2. Connectivity status
3. Validation action/status
4. Formula/mass/canonical result
5. Local VSEPR model
6. 3D source-labelled model

## Do Not

- Do not show raw technical errors directly to students.
- Do not hide disconnected-component status.
- Do not call a 2D layout “전자쌍 반발 결과.”
- Do not show one VSEPR shape for an entire multi-center chain.
- Do not overclaim generated 3D models.
- Do not require students to understand SMILES/Molfile to fix a structure.

## Output Standard

Include:

- teacher intent
- exact student action
- connectivity feedback
- misconception prevented
- accessibility/mobile consideration
- teacher-facing technical detail kept out of student view
