# 공개형 분자구조 분석기 재구축 패키지

이 폴더는 기존 교육 플랫폼을 보존하면서, 로그인 없이 누구나 사용할 수 있는 공개형 분자구조 분석기로 병렬 재구축하기 위한 실행 문서와 Agent Skill 모음입니다.

## 목표

기존 `apps/workbench`는 안정판으로 보존합니다. 새 프로그램은 `apps/analyzer`에 별도로 구축한 뒤, 화학 정확성·사용성·성능·배포 검증이 끝난 시점에만 Vercel 배포 대상을 전환합니다.

핵심 사용자 흐름은 다음 네 단계로 제한합니다.

1. 구조 입력
2. 구조 분석
3. 3D 자료 확인
4. 결과 저장

## 시작 순서

1. `00_PUBLIC_MOLECULE_ANALYZER_REBUILD_PIPELINE.md`를 읽습니다.
2. `prompts/00_START_REBUILD.md`를 Codex 또는 Claude Code에 입력합니다.
3. 작업 단계에 맞는 `skills/*/SKILL.md`를 함께 참조시킵니다.
4. 한 번에 한 Phase만 구현합니다.
5. 각 Phase가 끝날 때 `skills/release-verification/SKILL.md`의 부분 검증 절차를 적용합니다.

## 폴더 구성

```text
재구축/
├── README.md
├── 00_PUBLIC_MOLECULE_ANALYZER_REBUILD_PIPELINE.md
├── 01_MASTER_EXECUTION_CHECKLIST.md
├── prompts/
│   └── 00_START_REBUILD.md
├── references/
│   ├── CHEMISTRY_ACCEPTANCE_MATRIX.md
│   ├── ARCHITECTURE_TARGET.md
│   └── PUBLIC_SKILL_SOURCES_AND_LICENSES.md
└── skills/
    ├── SKILL_INDEX.md
    ├── rebuild-planning/SKILL.md
    ├── chemistry-analysis-validation/SKILL.md
    ├── scientific-frontend-design/SKILL.md
    ├── molecule-webapp-testing/SKILL.md
    ├── systematic-molecule-debugging/SKILL.md
    ├── release-verification/SKILL.md
    └── skill-maintenance/SKILL.md
```

## 절대 원칙

- 기존 `apps/workbench`를 재구축 실험장으로 사용하지 않습니다.
- 새 앱이 기준 테스트를 통과하기 전 기존 배포 설정을 변경하지 않습니다.
- RDKit이 읽을 수 있는 구조와 프로그램이 교육적으로 해석 가능한 구조를 구분합니다.
- 분자식, 질량, 전하, 구조 표현은 수작업 원소 목록이 아니라 화학 툴킷 결과를 우선합니다.
- PubChem 자료와 프로그램 계산값을 혼합하지 않습니다.
- 3Dmol.js는 좌표 시각화 도구이며 좌표 생성·최적화 엔진으로 표현하지 않습니다.
- VSEPR은 모든 분자에 적용되는 범용 3D 분석기가 아닙니다.
- 기능 완료 선언은 최신 테스트 실행 결과가 있을 때만 합니다.

## Agent Skills 사용 방법

Agent Skills 표준을 지원하는 도구에서는 각 스킬 디렉터리를 해당 도구의 프로젝트 스킬 경로에 복사할 수 있습니다. 스킬 경로가 정해져 있지 않은 도구에서는 프롬프트에 필요한 `SKILL.md` 경로를 직접 지정합니다.

```text
재구축/00_PUBLIC_MOLECULE_ANALYZER_REBUILD_PIPELINE.md와
재구축/skills/rebuild-planning/SKILL.md를 읽고 Phase 0만 수행하라.
기존 apps/workbench는 수정하지 말라.
```

## 완료 기준

- 대표 중성 분자, 이온, 다중 조각 구조가 허용 기준대로 분석됨
- 지원하지 않는 구조를 성공한 것처럼 표시하지 않음
- 모바일과 데스크톱에서 핵심 흐름이 동작함
- 구조 편집기, RDKit WASM, 3D 뷰어의 실패 상태가 명확함
- 네트워크가 없어도 2D 구조 분석 기능은 가능한 범위에서 유지됨
- 실제 배포 Preview에서 테스트를 통과함
- 기존 배포로 되돌릴 수 있는 롤백 절차가 문서화됨
