# 다양한 분자의 분자구조 모델링 - ChatGPT Prompt Context

작성일: 2026-06-30  
상태: prototype  
작업 폴더: `C:\all\molecule-modeling-skill-package`  
앱 위치: `apps/workbench`  
현재 브랜치: `feature/vsepr-3d-model-viewer`  
목적: 이 문서는 ChatGPT 프로젝트에 전달하여, 현재 작업 상태에 맞는 후속 개발 프롬프트를 생성하기 위한 컨텍스트이다.

## 1. 프로젝트 한 문장 정의

다양한 분자의 분자구조 모델링은 고등학교 화학 수업에서 학생이 2D 분자 구조를 그리고, 검증된 구조 정보와 3D 시각화를 확인할 수 있게 하는 ChemDraw-like 교육용 분자 구조 편집기 MVP이다.

목표는 ChemDraw 전체 복제가 아니다.  
1차 목표는 수업용 구조 입력, 검증, 예제 로드, 3D 시각화, 활동 모드를 갖춘 안정적인 classroom MVP이다.

## 2. 핵심 설계 원칙

- Ketcher는 2D 분자 구조 입력기이다.
- RDKit.js는 구조 검증, canonical SMILES, 분자식, 평균 분자량 계산 담당이다.
- 3Dmol.js는 좌표 데이터 시각화 도구이다.
- PubChem은 외부 3D 좌표 후보 데이터 출처이다.
- VSEPR Engine은 교육용 구조 예측 보조 모듈이며, 실제 실험 구조나 계산화학 최적화 결과가 아니다.
- 학생에게 표시하는 분자식과 분자량은 반드시 RDKit.js 검증 결과를 기준으로 한다.
- PubChem, 예제 데이터, VSEPR 결과가 RDKit.js 검증값을 덮어쓰면 안 된다.
- SMILES만으로 가짜 3D 구조를 만들지 않는다.
- 2D MOL block을 실제 3D 구조로 표시하지 않는다.
- VSEPR 예측 모형과 PubChem 실제/외부 3D 구조는 UI와 데이터 흐름에서 명확히 분리한다.

## 3. 현재 기술 스택

- Frontend: React + Vite + TypeScript
- 2D editor: Ketcher
- Chemistry validation: RDKit.js
- 3D viewer: 3Dmol.js
- External 3D source prototype: PubChem PUG-REST
- Tests: Vitest 중심, 일부 브라우저 수동/자동 확인

`apps/workbench/package.json` 기준 주요 의존성:

- `react`
- `react-dom`
- `vite`
- `typescript`
- `@rdkit/rdkit`
- `ketcher-core`
- `ketcher-react`
- `ketcher-standalone`
- `3dmol`
- `vitest`

## 4. 현재 구현된 기능

### 4.1 기본 앱 레이아웃

- React + Vite + TypeScript 앱 생성 완료.
- 상단 제목 영역, 좌측 구조 편집 영역, 우측 구조 정보 패널, 하단 로그/검증 영역 구성.
- 로컬 실행 URL: `http://127.0.0.1:5173`

### 4.2 Ketcher 2D 구조 편집기

- 좌측 편집 영역에 Ketcher 기반 2D editor 통합.
- 사용자가 구조를 그린 뒤 SMILES 또는 MOL block을 추출할 수 있다.
- 빈 구조 또는 추출 실패는 하단 로그에 표시한다.
- Ketcher 내부의 혼동 가능한 3D Viewer 버튼은 현재 숨김 처리했다.

### 4.3 Molecule Data Contract

주요 타입:

- `MoleculeInput`
- `MoleculeValidationResult`
- `MoleculeRenderState`
- `Molecule3DInput`
- `PubChemCandidate`
- `PubChemCandidateSearchResult`
- `ActivityTemplate`
- `ActivityQuestion`
- `AppMode`
- `UserMode`
- `VseprAnalysis`
- `VseprGeometryTemplate`

주요 파일:

- `apps/workbench/src/types/molecule.ts`
- `apps/workbench/src/types/activity.ts`
- `apps/workbench/src/types/vsepr.ts`

### 4.4 RDKit.js 검증 레이어

주요 파일:

- `apps/workbench/src/services/rdkitService.ts`

역할:

- RDKit.js 초기화
- Ketcher에서 받은 SMILES 또는 MOL block 검증
- MOL block이 있으면 MOL block 우선 검증
- canonical SMILES 생성
- molecularFormula 계산
- molecularWeight 계산

중요:

- molecularWeight는 RDKit descriptor `amw` 기반 평균 분자량으로 다룬다.
- exact mass와 혼용하지 않는다.
- 검증 실패 시 학생용 메시지와 개발자용 로그를 분리한다.
- 검증 실패 구조는 결과 패널에 분자식/분자량을 표시하지 않는다.

### 4.5 예제 분자 라이브러리

주요 파일:

- `apps/workbench/src/data/exampleMolecules.ts`

예제:

- 물
- 메테인
- 암모니아
- 이산화탄소
- 에탄올
- 아세트산
- 벤젠
- 포도당
- 아스피린

흐름:

- 예제 버튼 선택
- Ketcher에 SMILES 로드
- 기존 RDKit.js 검증 흐름 통과
- expectedFormula와 RDKit 결과가 다르면 경고 로그 표시
- 화면 표시 기준값은 RDKit 결과이다.

### 4.6 3Dmol.js 실제/외부 3D 구조 Viewer

주요 파일:

- `apps/workbench/src/components/Molecule3DViewer.tsx`

역할:

- 정적 3D 좌표 데이터 표시
- PubChem SDF 기반 3D 구조 표시
- 3D 좌표가 없을 때 학생용 안내 메시지 표시

중요:

- 3Dmol.js는 3D 구조 생성기가 아니다.
- SMILES를 자동으로 3D 좌표로 바꾸지 않는다.
- 2D MOL block을 실제 3D 좌표처럼 보여주지 않는다.
- PubChem 또는 정적 좌표 데이터는 시각화 자료이며, 분자식/분자량 기준값이 아니다.

### 4.7 정적 3D 예제 데이터

- 물, 메테인, 에탄올 등 일부 예제에 정적 3D 좌표 데이터를 연결했다.
- 좌표가 있는 예제는 3Dmol.js Viewer에 표시된다.
- 좌표가 없는 예제는 "3D 좌표 데이터가 아직 없습니다" 안내를 유지한다.

### 4.8 PubChem CID 기반 3D SDF 로딩

주요 파일:

- `apps/workbench/src/services/pubchem3d.ts`

구현:

- 예제 분자에 등록된 PubChem CID로 3D SDF 요청
- 성공 시 3Dmol.js Viewer에 전달
- 실패 시 학생용 메시지와 개발자용 로그 분리

등록 CID 예:

- 물: `962`
- 메테인: `297`
- 에탄올: `702`
- 벤젠: `241`

중요:

- PubChem에서 가져온 구조는 3D 시각화용이다.
- PubChem 분자식/분자량으로 RDKit 검증값을 덮어쓰지 않는다.

### 4.9 수동 PubChem 후보 검색 UI

주요 파일:

- `apps/workbench/src/services/pubchemSearch.ts`
- `apps/workbench/src/components/pubchem/PubChemCandidatePanel.tsx`

흐름:

- 사용자가 직접 구조를 그림
- RDKit.js 검증 성공
- canonicalSmiles 생성
- 사용자가 `PubChem 후보 검색` 버튼 클릭
- PubChem 후보 목록 표시
- 후보가 1개여도 자동 선택하지 않음
- 사용자가 후보 직접 선택
- 기존 CID 기반 3D SDF 로딩 함수 재사용

중요:

- 직접 그린 구조를 PubChem에 자동 검색하지 않는다.
- 후보 자동 선택 금지.
- 후보 정보는 "외부 데이터 후보"로만 표시한다.

### 4.10 수업용 활동 모드 MVP

주요 파일:

- `apps/workbench/src/data/activityTemplates.ts`
- `apps/workbench/src/components/activity/ActivityPanel.tsx`
- `apps/workbench/src/types/activity.ts`

모드:

- `free_draw`: 자유 그리기
- `activity`: 수업 활동

활동 예:

- 물 분자 구조 그리기
- 메테인 분자 구조 그리기
- 암모니아 분자 구조 그리기
- 에탄올 분자 구조 그리기
- 벤젠 분자 구조 그리기

학생 입력:

- 예상 분자식
- 예상 분자량
- 구조를 그렇게 그린 이유
- 검증 후 알게 된 점

비교:

- 학생 예측값과 RDKit.js 검증값을 단순 문자열 비교한다.
- 자동 점수화는 하지 않는다.

### 4.11 학생용/교사용 모드 분리 MVP

주요 파일:

- `apps/workbench/src/components/TeacherPanel.tsx`
- `apps/workbench/src/components/header/AppHeader.tsx`
- `apps/workbench/src/types/activity.ts`

모드:

- `student`
- `teacher`

학생 모드:

- 활동 선택
- 학습 목표
- 분자 구조 그리기
- 예측 입력
- RDKit 검증 결과
- 3D 구조 Viewer
- PubChem 후보 검색
- 정리 문항
- 선택적으로 여는 VSEPR 예측 모듈

학생 모드에서 숨김:

- 개발자 로그
- HTTP status 세부 정보
- 원본 API 응답
- 교사용 해설
- 내부 타입 정보

교사 모드:

- 활동 템플릿 정보
- 학습 목표
- 핵심 개념
- 예상 분자식
- 예상 VSEPR 구조
- 활동 질문 목록
- 학생 입력 항목 목록
- RDKit 검증 상태
- VSEPR 분석 상태
- 3D 구조 제공 상태
- PubChem 연결 상태
- 오개념 체크 포인트
- 접을 수 있는 개발자 로그

주의:

- 로그인 없음.
- 인증 없음.
- DB 저장 없음.
- 자동 채점 없음.
- 학생별 제출 목록 없음.

## 5. VSEPR 관련 현재 결정

### 5.1 구현된 VSEPR 기능

주요 파일:

- `apps/workbench/src/services/vseprEngine.ts`
- `apps/workbench/src/services/vseprGeometryTemplates.ts`
- `apps/workbench/src/components/vsepr/VseprPanel.tsx`
- `apps/workbench/src/components/Vsepr3DModelViewer.tsx`

기능:

- Ketcher MOL block에서 원자/결합 정보를 파싱한다.
- 중심 원자 후보를 찾는다.
- 중심 원자 주변 결합 전자쌍 영역과 비공유 전자쌍을 교육용 규칙으로 추정한다.
- AXE 표기, 전자쌍 배열, 분자 구조, 이상적 결합각, 신뢰도, 경고를 반환한다.
- VSEPR 3D 예측 모형 Viewer는 template 단위 벡터를 3Dmol.js로 시각화한다.

지원 구조:

- AX2: 선형
- AX3: 삼각 평면
- AX2E: 굽은형
- AX4: 정사면체
- AX3E: 삼각뿔형
- AX2E2: 굽은형
- AX5: 삼각쌍뿔
- AX4E: 시소형
- AX3E2: T자형
- AX2E3: 선형
- AX6: 팔면체
- AX5E: 사각뿔형
- AX4E2: 사각평면형

### 5.2 VSEPR 문제와 최근 수정

문제:

- NH3가 실제로는 삼각뿔형이어야 하는데, VSEPR 모형이 제대로 표시되지 않았다.

원인:

- VSEPR Engine이 `AX3E1` 같은 표기를 만들었고, template 쪽은 `AX3E`를 기대하여 매칭이 실패했다.

수정:

- lone pair가 1개인 경우 `E1`이 아니라 `E`로 표기하도록 수정했다.
- template alias도 보강했다.
- 현재 암모니아는 `AX3E`, `삼각뿔형`, `<109.5°`로 표시되어야 한다.

### 5.3 Claude VSEPR prototype 반영 범위

로컬에 추가된 참고 파일:

- `vsepr-engine.js`
- `분자구조_VSEPR_시뮬레이터.html`

반영한 내용:

- Be, B, Xe 등 일부 중심 원자 규칙 보강
- terminal ligand 구조의 중심 원자 자동 선택 개선
- `AXmE0`, `AXmE1` alias 호환 보강
- 표준 예제 기반 회귀 테스트 보강

반영하지 않은 내용:

- 에너지 최소화 solver
- 실험 결합각처럼 보일 수 있는 정량 표현
- 별도 canvas UI
- polarity vector sum

반영하지 않은 이유:

- 현재 MVP 원칙상 VSEPR은 교육용 예측 모델이다.
- 에너지 최소화나 실제 구조 계산처럼 보이는 기능은 학생에게 오해를 줄 수 있다.
- PubChem 실제/외부 3D 구조와 VSEPR 예측 모형을 분리해야 한다.

### 5.4 VSEPR의 현재 제품 내 위치

최신 결정:

- VSEPR을 완전히 삭제하지 않고, 기본 자유 그리기 흐름에서는 선택 교육 모듈로 격리한다.
- 자유 그리기 기본 화면에서는 VSEPR 전체 패널을 바로 노출하지 않는다.
- 학생이 명시적으로 `VSEPR 예측 모듈 열기`를 눌렀거나, 수업 활동 모드일 때만 VSEPR 패널과 VSEPR 3D 예측 모형을 보여준다.
- PubChem 3D 구조 출력은 정상 작동하므로, 핵심 3D 시각화는 PubChem/정적 좌표 쪽을 중심으로 유지한다.

## 6. 주요 파일 구조

```text
apps/workbench/
  package.json
  src/
    main.tsx
    app/
      App.tsx
      App.test.tsx
    components/
      Molecule3DViewer.tsx
      Vsepr3DModelViewer.tsx
      TeacherPanel.tsx
      activity/ActivityPanel.tsx
      editor/KetcherEditor.tsx
      header/AppHeader.tsx
      molecule-panel/StructureInfoPanel.tsx
      pubchem/PubChemCandidatePanel.tsx
      validation/ValidationLogPanel.tsx
      vsepr/VseprPanel.tsx
    data/
      exampleMolecules.ts
      activityTemplates.ts
    editor/
      chemical-editor-handle.ts
      ketcher-structure-extraction.ts
    services/
      rdkitService.ts
      pubchem3d.ts
      pubchemSearch.ts
      vseprEngine.ts
      vseprGeometryTemplates.ts
    styles/
      global.css
    types/
      molecule.ts
      activity.ts
      vsepr.ts
docs/
  CHATGPT_PROJECT_HANDOFF.md
  CHATGPT_PROMPT_CONTEXT_20260630.md
  CLAUDE_VSEPR_ENGINE_REVIEW.md
  EDUCATION_USE_CASES.md
  LIBRARY_DECISION_LOG.md
  MVP_IMPLEMENTATION_STATUS.md
  PUBCHEM_MATCHING_POLICY.md
  RDKIT_VALIDATION_CHECKLIST.md
  ROADMAP.md
  TDD_DRAFT.md
  TEACHER_STUDENT_MODE_POLICY.md
  THREE_D_DATA_POLICY.md
  VSEPR_CROSS_VALIDATION.md
  VSEPR_ENGINE_POLICY.md
```

## 7. 실행 방법

PowerShell:

```powershell
cd C:\all\molecule-modeling-skill-package\apps\workbench
npm install
npm run dev
```

브라우저:

```text
http://127.0.0.1:5173
```

타입 검사:

```powershell
npx tsc --noEmit
```

빌드:

```powershell
npm run build
```

테스트:

```powershell
npm test -- --run
```

## 8. 최근 검증 기록

최근 작업 중 확인된 검증:

- `npx tsc --noEmit`: 통과
- VSEPR/App 관련 Vitest target: 5개 파일, 22개 테스트 통과
- `npm run build`: 통과
- 로컬 서버: `http://127.0.0.1:5173` 응답 `200`
- 브라우저 확인:
  - 자유 그리기 기본 화면에서 VSEPR은 선택 모듈 gate로 표시
  - `VSEPR 예측 모듈 열기` 클릭 시 VSEPR 패널과 VSEPR 3D Viewer 표시
  - 수업 활동 모드에서는 VSEPR 모듈 표시
  - PubChem 3D 구조 출력은 정상 작동

주의:

- 일부 검증은 직전 작업 흐름에서 확인한 결과이며, 이 문서 생성 시점에 전체 테스트를 새로 재실행한 것은 아니다.
- 빌드 시 3Dmol.js 관련 `eval` 경고와 chunk size 경고가 있을 수 있다.

## 9. 현재 Git 상태 주의

현재 브랜치:

```text
feature/vsepr-3d-model-viewer
```

마지막 커밋:

```text
e82371b feat: add VSEPR educational geometry engine MVP
```

마지막 커밋 이후 미커밋 변경이 남아 있다.

주요 미커밋 변경:

- VSEPR 3D 예측 모형 Viewer
- VSEPR template/alias 개선
- NH3 VSEPR 표기 오류 수정
- Claude VSEPR prototype 교차검증 문서
- 학생/교사용 모드 분리
- TeacherPanel 추가
- ValidationLogPanel 표시 조건 변경
- 활동 템플릿 교사용 정보 확장
- VSEPR 선택 교육 모듈 격리

커밋 전 확인할 것:

- `.test_runs/` 포함 여부
- `프로그램실행.mp4` 같은 확인용 파일 포함 여부
- Claude 원본 참고 파일을 커밋할지, docs에만 기록하고 제외할지 결정
- staged diff 확인

## 10. 현재 의도적으로 구현하지 않은 기능

- ChemDraw 전체 복제
- 학생 로그인
- 교사 인증
- Firebase 연동
- DB 저장
- 학생별 제출 목록
- 교사용 대시보드
- 자동 채점
- PDF/이미지 내보내기
- RDKit 3D conformer 생성
- Open Babel 백엔드
- 에너지 최소화
- 정밀 결합각/결합길이 계산
- PubChem 결과로 RDKit 검증값 덮어쓰기
- 직접 그린 구조의 PubChem 자동 매칭
- PubChem 후보 자동 선택

## 11. 실패 가능성이 높은 지점

### VSEPR 관련

- Ketcher MOL block에서 수소가 생략될 때 implicit hydrogen 추정이 필요하다.
- 단순 분자에는 동작하지만 복잡한 구조에서는 신뢰도가 낮아질 수 있다.
- 에탄올처럼 중심 원자가 여러 개인 분자는 전체 분자를 하나의 VSEPR 구조로 단정하면 안 된다.
- 전이금속, 라디칼, 복잡한 공명 구조는 unsupported 또는 low confidence로 처리해야 한다.
- VSEPR 예측 모형이 PubChem 실제 3D 구조처럼 보이면 교육적으로 위험하다.

### PubChem 관련

- 외부 네트워크와 PubChem 응답 상태에 의존한다.
- PubChem 3D 데이터가 없을 수 있다.
- PubChem 후보가 0개, 1개, 여러 개일 수 있다.
- 후보가 1개여도 자동 선택하면 안 된다.

### UI/UX 관련

- 학생 모드에 개발자 로그나 교사용 해설이 노출되면 안 된다.
- VSEPR이 기본 자유 그리기 흐름을 방해하면 안 된다.
- 3D Viewer가 실제/외부 3D 구조 Viewer인지 VSEPR 예측 모형 Viewer인지 명확해야 한다.

### 배포 관련

- 3Dmol.js 번들 크기와 `eval` 경고 검토 필요.
- Ketcher/RDKit/3Dmol.js 조합은 번들이 커질 수 있다.

## 12. 다음 작업 후보

우선순위 높은 작업:

1. 현재 미커밋 변경 정리 및 커밋
2. VSEPR 선택 모듈 정책을 UI/문서/테스트에 더 고정
3. 학생/교사 모드 4가지 조합 확인
   - `free_draw + student`
   - `free_draw + teacher`
   - `activity + student`
   - `activity + teacher`
4. PubChem 3D 구조 출력 흐름을 기준 기능으로 안정화
5. VSEPR은 수업 활동 보조 모듈로만 유지할지, 완전 제거할지 최종 결정 문서화
6. `docs/ROADMAP.md`, `docs/TDD_DRAFT.md`, `docs/VSEPR_ENGINE_POLICY.md` 최신화
7. 테스트/빌드 재실행 후 결과 기록

다음 단계 후보:

- VSEPR 완전 삭제가 아니라 optional module로 유지하는 방향이면, UI 문구를 더 명확히 정리
- VSEPR을 완전히 제외하기로 하면, 관련 컴포넌트/서비스/테스트/docs 제거 계획을 먼저 세우고 단계적으로 삭제
- PubChem 3D 구조 안정화와 예제 분자 수업 흐름을 우선순위로 둠
- 학생용 활동 결과 저장/교사용 대시보드는 아직 보류

## 13. ChatGPT에 넣을 수 있는 기본 프롬프트

아래 프롬프트를 ChatGPT 프로젝트에 붙여넣고, 필요한 후속 작업을 요청하면 된다.

```text
너는 React + Vite + TypeScript 기반 다양한 분자의 분자구조 모델링 프로젝트를 이어받는 개발 보조자다.

프로젝트 목표:
- ChemDraw 전체 복제가 아니라, 고등학교 화학 수업용 ChemDraw-like 분자 구조 편집기 MVP를 만든다.
- 학생이 2D 구조를 그리고, RDKit.js 검증을 통과한 구조에 대해서만 분자식, 평균 분자량, canonical SMILES, 3D 시각화를 확인하게 한다.

핵심 역할 분리:
- Ketcher = 2D 구조 입력기
- RDKit.js = 구조 검증, canonical SMILES, 분자식, 평균 분자량 계산
- 3Dmol.js = 3D 좌표 데이터 시각화
- PubChem = 외부 3D 좌표 후보 데이터 출처
- VSEPR Engine = 교육용 구조 예측 보조 모듈, 실제 실험 구조나 계산화학 결과 아님

현재 구현 상태:
- React + Vite + TypeScript 앱 있음
- Ketcher 2D editor 통합 완료
- RDKit.js 검증 레이어 완료
- 예제 분자 라이브러리 완료
- 3Dmol.js Viewer 완료
- 정적 3D 예제 일부 연결 완료
- PubChem CID 기반 3D SDF 불러오기 완료
- 수동 PubChem 후보 검색 UI 완료
- 수업 활동 모드 MVP 완료
- 학생/교사 모드 분리 MVP 진행/구현됨
- VSEPR Engine 및 VSEPR 3D 예측 모형은 구현되어 있으나, 기본 자유 그리기 흐름에서는 선택 교육 모듈로 격리하는 방향이다.
- PubChem 3D 구조 출력은 정상 작동한다.

절대 지킬 것:
- 검증되지 않은 화학값을 학생에게 계산 결과처럼 표시하지 말 것.
- PubChem 값으로 RDKit.js 검증값을 덮어쓰지 말 것.
- SMILES만으로 가짜 3D 구조를 만들지 말 것.
- 2D MOL block을 실제 3D 구조로 표시하지 말 것.
- VSEPR 예측 모형을 실제 실험 구조처럼 설명하지 말 것.
- 학생 로그인, DB 저장, 자동 채점, Firebase, 교사용 대시보드는 아직 구현하지 말 것.
- 대규모 UI 리디자인보다 데이터 흐름과 검증 구조를 우선할 것.

현재 논의된 방향:
- VSEPR은 핵심 기능에서 빼거나 최소한 선택 교육 모듈로 격리한다.
- 기본 기능의 중심은 Ketcher 입력 -> RDKit 검증 -> PubChem/정적 좌표 3D 시각화이다.
- 수업 활동에서 필요한 경우에만 VSEPR을 보조 설명 도구로 사용할 수 있다.

후속 작업을 제안할 때는 다음 형식으로 답해라:
1. 작업 목표
2. 변경할 파일
3. 데이터 흐름 영향
4. 학생에게 노출되는 내용
5. 교사에게 노출되는 내용
6. 하지 않을 것
7. 테스트 전략
8. 실패 가능성이 높은 지점
```

## 14. ChatGPT에 요청하기 좋은 후속 프롬프트 예시

### 14.1 현재 변경 정리 및 커밋 전 점검

```text
현재 다양한 분자의 분자구조 모델링의 미커밋 변경을 점검해줘.
목표는 VSEPR 선택 교육 모듈 격리, 학생/교사 모드 분리, PubChem 3D 정상 흐름을 깨지 않는지 확인하는 것이다.
코딩 전 git diff를 읽고, 변경 파일별 위험도와 테스트 필요 항목을 먼저 보고해줘.
```

### 14.2 VSEPR을 optional module로 더 정리

```text
VSEPR 기능을 삭제하지 않고 optional classroom module로 격리해줘.
자유 그리기 기본 화면에서는 VSEPR 패널과 VSEPR 3D Viewer를 숨기고, 사용자가 명시적으로 열 때만 표시해줘.
수업 활동 모드에서는 활동 템플릿이 VSEPR을 요구할 때만 표시되도록 설계해줘.
PubChem 3D Viewer와 VSEPR 3D Viewer가 혼동되지 않게 UI 문구와 타입을 점검해줘.
```

### 14.3 VSEPR 완전 제거를 검토할 때

```text
VSEPR Engine과 VSEPR 3D Viewer를 완전히 제거할 경우의 영향도를 분석해줘.
아직 코딩하지 말고, 제거 대상 파일, 유지해야 할 PubChem 3D 기능, 삭제하면 깨질 테스트, 문서 수정 항목을 먼저 제안해줘.
```

### 14.4 PubChem 3D 흐름 안정화

```text
PubChem 3D 구조 불러오기 기능을 수업용 핵심 흐름으로 안정화해줘.
Ketcher 2D 구조, RDKit 검증값, PubChem 3D SDF 시각화가 서로 역할 충돌 없이 분리되는지 점검하고,
네트워크 실패, CID 없음, 3D 데이터 없음 상황의 학생용 메시지와 개발자 로그를 정리해줘.
```

### 14.5 학생/교사 모드 QA

```text
학생 모드와 교사 모드 분리 상태를 QA해줘.
free_draw + student, free_draw + teacher, activity + student, activity + teacher 4가지 조합에서
학생에게 개발자 로그나 교사용 해설이 보이지 않는지,
교사는 활동 정보와 검증 상태를 볼 수 있는지 확인해줘.
```

## 15. 검토 필요 항목

| ID | 항목 | 이유 | 확인 방법 | 상태 |
|---|---|---|---|---|
| V-001 | VSEPR 유지/격리/제거 최종 결정 | VSEPR은 교육적으로 유용하지만 기본 기능을 복잡하게 만들 수 있음 | 교사 관점 사용성 검토 후 결정 | 검토 필요 |
| V-002 | VSEPR 과학 정확성 | implicit hydrogen 추정과 AXE 매핑은 MVP 규칙임 | 교과서 예제 기준으로 물, NH3, CH4, CO2, BF3, PCl5 등 검토 | 검토 필요 |
| V-003 | PubChem 3D 실패 처리 | 외부 API 의존 | 네트워크 차단, CID 없음, 3D data 없음 테스트 | 검토 필요 |
| V-004 | 학생/교사 정보 분리 | 학생에게 내부 로그/교사용 해설 노출 금지 | 4가지 모드 조합 UI 확인 | 검토 필요 |
| V-005 | 미커밋 파일 정리 | 테스트 산출물/영상/Claude 원본 포함 여부 결정 필요 | `git status --short`, `git diff --cached` 확인 | 검토 필요 |
| V-006 | 배포 전 번들 경고 | 3Dmol.js eval/chunk size 경고 | Vite build 로그와 lazy loading 검토 | 검토 필요 |
