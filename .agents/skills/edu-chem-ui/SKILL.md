---
name: edu-chem-ui
description: Use when designing or reviewing Korean high-school chemistry classroom UI/UX for the molecule modeling app, including teacher/student modes, explanations, warning messages, worksheet export, and misconception prevention.
---

# Educational Chemistry UI Skill

## Purpose

Use this skill when designing UI text, layout, examples, and classroom workflows.

This app is for high-school chemistry education. Accuracy, clarity, and misconception prevention matter more than visual novelty.

## UI Principles

1. Show the structure first, then calculated results.
2. Make validation status visible.
3. Use Korean terms familiar to high-school chemistry students.
4. Avoid overwhelming students with cheminformatics jargon.
5. Provide teacher-facing explanations separately from student-facing labels.
6. Warn when a model is simplified.

## Recommended Main Layout

```text
[상단] 앱 제목 / 예제 선택 / 내보내기
[좌측] 구조식 편집기
[우측] 검증 상태, 분자식, 분자량, SMILES, 설명
[하단] 수업 활동 질문 또는 3D 보기
```

## Korean UI Labels

- 분자 구조 그리기
- 예제 불러오기
- 구조 검증
- 검증 완료
- 검토 필요
- 분자식
- 분자량
- 구조 이미지 저장
- 3D 구조 보기
- 학생 활동 질문
- 교사용 설명

## Misconception Warnings

Use warnings like:

```text
이 3D 구조는 개념 이해를 돕기 위한 모델입니다. 실제 분자의 모든 운동과 전자 분포를 완전히 나타내지는 않습니다.
```

```text
현재 구조는 계산에 사용할 수 있는 분자 구조로 검증되지 않았습니다. 결합 수와 원자 표기를 확인해 주세요.
```

## Initial Example Library

Group examples by concept:

- 기본 분자: 물, 메테인, 암모니아, 이산화탄소
- 유기 기초: 에탄올, 아세트산, 벤젠
- 생활 속 분자: 포도당, 아스피린, 카페인
- 이성질체: 에탄올/다이메틸 에터, 부탄/아이소부탄

## Do Not

- Do not show raw technical errors directly to students.
- Do not hide validation status.
- Do not overclaim generated 3D models.
- Do not make the app look like a research-only tool.

## Output Standard

When changing UI, include:

- teacher intent
- student action
- misconception prevented
- accessibility/mobile consideration
