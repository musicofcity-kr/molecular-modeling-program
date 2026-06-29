# First Prompts for Codex

## 1. Workspace planning prompt

```text
이 저장소의 AGENTS.md와 .agents/skills를 먼저 읽고, docs/PRD_DRAFT.md와 docs/TDD_DRAFT.md를 기준으로 Molecule Modeling Workbench의 MVP 구현 계획을 수립해줘. 아직 코딩하지 말고 /plan 모드처럼 단계별 파일 구조, 필요한 dependency 후보, 검증 기준, 테스트 전략부터 제안해줘.
```

## 2. React/Vite scaffold prompt

```text
chem-architecture와 source-driven-development 스킬을 사용해서 React + Vite + TypeScript 기반 MVP 스캐폴드를 생성해줘. 아직 Ketcher/RDKit 구현은 하지 말고, src 구조, 라우팅 없는 단일 화면, 예제 molecule 데이터 구조, validation service 인터페이스, 테스트 기본틀만 만들어줘. 완료 후 npm run lint/typecheck/test 명령 제안을 포함해줘.
```

## 3. Ketcher integration spike prompt

```text
ketcher-integration 스킬을 사용해서 Ketcher를 최소 기능으로 앱에 삽입하는 spike를 진행해줘. 목표는 editor load, example molecule load, SMILES/Molfile extraction 가능 여부 확인이야. dependency 추가 전 공식 문서와 license를 확인하고 docs/LIBRARY_DECISION_LOG.md에 기록해줘.
```

## 4. RDKit validation prompt

```text
rdkit-validation과 test-driven-development 스킬을 사용해서 RDKit.js 기반 MoleculeValidationService를 구현해줘. ethanol, benzene, acetic acid, aspirin 예제를 먼저 테스트로 고정하고, 유효하지 않은 입력에서는 formula/mass가 표시되지 않도록 만들어줘.
```

## 5. Classroom UI prompt

```text
edu-chem-ui 스킬을 사용해서 교사용/학생용 수업 화면을 정리해줘. 핵심은 구조 그리기, 검증 상태, 분자식/분자량, 이미지 내보내기, 예제 불러오기야. 고등학생이 이해할 수 있는 한국어 경고문과 설명문을 추가해줘.
```
