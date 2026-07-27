# Connectivity Policy Reference

## Default

`single-molecule` is the default intent for student free drawing.

## Decision Table

| Atom count | Component count | Intent | Decision |
|---:|---:|---|---|
| 0 | 0 | any | empty; ask student to draw |
| >0 | 1 | any | connectivity passes |
| >0 | >1 | single-molecule | block and guide reconnection |
| >0 | >1 | ionic-compound | allow with ion/formula-unit explanation |
| >0 | >1 | mixture | allow with mixture-specific result policy |

## Student Messages

Blocked:

```text
현재 구조가 여러 조각으로 나뉘어 있습니다. 하나의 분자를 만들려면 원자 사이를 결합으로 연결해 주세요.
```

Allowed ionic representation:

```text
이 활동은 서로 떨어진 이온을 포함할 수 있습니다. 표시된 구조는 하나의 공유결합 분자라기보다 이온의 조합을 나타냅니다.
```

## Never Do

- Never silently coerce multiple components into one molecule.
- Never infer a missing bond only because atoms are visually close.
- Never use 2D pixel distance as chemical connectivity truth.
