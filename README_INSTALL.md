# Molecule Modeling Workbench — Codex Custom Skill Package v0.1

이 패키지는 ChemDraw-like 수업용 분자구조 모델링 웹앱을 Codex로 개발하기 위한 **커스텀 Agent Skill 초안**입니다.

목표는 ChemDraw 전체 복제가 아니라, 다음 구조를 가진 교육용 웹앱 개발을 안정화하는 것입니다.

- Ketcher: 2D 구조식 입력기
- RDKit.js: 분자식, 분자량, SMILES/MOL 검증 및 렌더링 보조
- 3Dmol.js: 3D 분자 보기
- Open Babel / RDKit Python: 고급 파일 변환과 선택적 백엔드 검증
- PubChem PUG-REST: 물질명·구조 검색 보조

## 설치 위치

Codex 공식 구조에 맞추어 프로젝트 루트에 아래처럼 배치합니다.

```text
molecule-modeling-workbench/
├─ AGENTS.md
├─ .agents/
│  └─ skills/
│     ├─ chem-architecture/
│     ├─ ketcher-integration/
│     ├─ rdkit-validation/
│     ├─ molecular-3d-viewer/
│     ├─ chem-file-interop/
│     ├─ edu-chem-ui/
│     ├─ source-driven-development/
│     ├─ test-driven-development/
│     ├─ code-review-and-quality/
│     └─ e2e-playwright-testing/
├─ docs/
└─ scripts/
```

## Windows PowerShell 설치 예시

압축을 푼 위치에서 다음 명령을 실행합니다.

```powershell
# 예: C:\all\molecule-modeling-workbench 에 설치
powershell -ExecutionPolicy Bypass -File .\scripts\install_to_project.ps1 -TargetProject "C:\all\molecule-modeling-workbench"
```

## 수동 설치

1. 새 작업폴더를 만듭니다.
2. 이 패키지의 `.agents`, `AGENTS.md`, `docs`, `scripts` 폴더를 작업폴더 루트로 복사합니다.
3. Codex를 해당 작업폴더에서 실행합니다.
4. 첫 작업은 `docs/CODEX_FIRST_PROMPTS.md`의 1번 프롬프트를 사용합니다.

## 권장 첫 실행

```text
이 저장소의 AGENTS.md와 .agents/skills를 먼저 읽고, docs/PRD_DRAFT.md와 docs/TDD_DRAFT.md를 기준으로 Molecule Modeling Workbench의 MVP 구현 계획을 수립해줘. 아직 코딩하지 말고 /plan 모드처럼 단계별 파일 구조와 검증 기준부터 제안해줘.
```

## 패키지 검증

```bash
python scripts/verify_skill_package.py
```

검증 항목:

- 모든 스킬 폴더에 `SKILL.md` 존재
- `SKILL.md`에 `name`, `description` YAML front matter 존재
- 스킬명 중복 여부

## 주의

이 패키지는 앱 완성본이 아닙니다. Codex가 흔들리지 않도록 하는 **작업 매뉴얼 묶음**입니다.
실제 앱 구현 시에는 라이브러리 버전, 라이선스, 학교 배포 환경, 학생 개인정보 처리 여부를 별도로 검토해야 합니다.
