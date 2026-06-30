# Molecule Modeling Workbench 작업 인수인계 요약

작성일: 2026-06-30  
상태: prototype  
작업 폴더: `C:\all\molecule-modeling-skill-package`  
앱 위치: `apps/workbench`  
현재 브랜치: `feature/vsepr-3d-model-viewer`

## 1. 프로젝트 목적

Molecule Modeling Workbench는 고등학교 화학 수업에서 사용할 수 있는 ChemDraw-like 분자 구조 편집기 MVP이다.

목표는 ChemDraw 전체 복제가 아니라, 학생이 2D 분자 구조를 그리고, RDKit.js 검증을 통과한 구조에 대해서만 분자식, 평균 분자량, canonical SMILES, 3D 시각화, VSEPR 예측을 확인할 수 있게 하는 수업용 도구를 만드는 것이다.

## 2. 핵심 원칙

- Ketcher는 2D 분자 구조 입력기이다.
- RDKit.js는 구조 검증, canonical SMILES, 분자식, 평균 분자량 계산 담당이다.
- 3Dmol.js는 좌표 데이터 또는 교육용 VSEPR template을 화면에 그리는 시각화 도구이다.
- PubChem은 외부 3D 좌표 후보 데이터 출처이며, RDKit.js 검증값을 대체하지 않는다.
- VSEPR Engine은 교육용 분자 구조 예측 엔진이며, 실제 실험 구조나 계산화학 최적화 구조가 아니다.
- 학생에게 보여주는 분자식과 분자량은 반드시 RDKit.js 검증 결과를 기준으로 한다.
- 검증 실패 구조는 학생용 결과 패널에 계산값을 표시하지 않는다.

## 3. 현재 구현된 기능

### 기본 앱

- React + Vite + TypeScript 기반 앱 생성 완료.
- 상단 제목 영역, 좌측 편집 영역, 우측 구조 정보 패널, 하단 로그 영역 구성.
- 로컬 실행: `npm run dev`
- 로컬 URL: `http://127.0.0.1:5173`

### Ketcher 2D 편집기

- 좌측 편집 영역에 Ketcher 기반 2D 구조 편집기 통합.
- 사용자가 그린 구조에서 SMILES와 MOL block 추출 가능.
- 추출 실패 또는 빈 구조는 하단 로그에 오류 표시.
- Ketcher 내부 3D Viewer 버튼은 현재 혼동을 막기 위해 숨김 처리함.

### Molecule Data Contract

주요 타입은 다음 파일에 정의되어 있다.

- `apps/workbench/src/types/molecule.ts`
- `apps/workbench/src/types/activity.ts`
- `apps/workbench/src/types/vsepr.ts`

핵심 타입:

- `MoleculeInput`
- `MoleculeValidationResult`
- `MoleculeRenderState`
- `Molecule3DInput`
- `PubChemCandidate`
- `ActivityTemplate`
- `VseprAnalysis`
- `VseprGeometryTemplate`
- `UserMode`
- `AppMode`

### RDKit.js 검증 레이어

- `apps/workbench/src/services/rdkitService.ts`
- RDKit.js 초기화 후 Ketcher에서 추출한 MOL block 또는 SMILES 검증.
- 현재 서비스는 MOL block이 있으면 MOL block을 우선 검증한다.
- 유효한 구조에 대해서만 다음 값을 표시한다.
  - canonicalSmiles
  - molecularFormula
  - molecularWeight
- molecularWeight는 RDKit descriptor `amw` 기반 평균 분자량이다. exact mass와 혼용하지 않는다.
- 실패 시 학생용 메시지와 개발자용 로그를 분리한다.

### 예제 분자 라이브러리

- `apps/workbench/src/data/exampleMolecules.ts`
- 예제 선택 후 Ketcher에 SMILES 로드.
- 로드 후 기존 RDKit.js 검증 흐름을 그대로 통과한다.
- 예제의 expectedFormula는 보조 검사용이며, 화면의 기준값은 RDKit.js 결과이다.

등록된 주요 예제:

- 물
- 메테인
- 암모니아
- 이산화탄소
- 에탄올
- 아세트산
- 벤젠
- 포도당
- 아스피린

### 3Dmol.js 실제/외부 3D 구조 Viewer

- `apps/workbench/src/components/Molecule3DViewer.tsx`
- 정적 3D 좌표 데이터 또는 PubChem SDF 데이터를 표시한다.
- SMILES만으로 3D 구조를 자동 생성하지 않는다.
- 2D MOL block을 실제 3D 구조로 표시하지 않는다.
- 3D 좌표가 없으면 학생용 안내 메시지를 표시한다.

정적 3D 예제:

- 일부 예제에 교육용 정적 3D 좌표 데이터 연결.
- 정적 좌표는 시각화용이며 분자식/분자량 기준값이 아니다.

### PubChem 3D CID 기반 로딩

- `apps/workbench/src/services/pubchem3d.ts`
- 예제 분자에 등록된 PubChem CID로 3D SDF를 가져오는 최소 프로토타입 구현.
- 사용자가 직접 버튼을 눌렀을 때만 PubChem 3D를 불러온다.
- PubChem SDF는 3Dmol.js 시각화용이며, RDKit.js 분자식/분자량을 덮어쓰지 않는다.

등록된 PubChem CID 예:

- 물: 962
- 메테인: 297
- 에탄올: 702
- 벤젠: 241

### 수동 PubChem 후보 검색

- `apps/workbench/src/services/pubchemSearch.ts`
- RDKit.js 검증을 통과하고 canonicalSmiles가 있을 때만 `PubChem 후보 검색` 버튼 활성화.
- 사용자가 버튼을 눌러야 PubChem 후보 검색이 실행된다.
- 후보가 1개여도 자동 선택하지 않는다.
- 후보 목록은 `외부 데이터 후보`로 표시한다.
- 후보 선택 후 기존 CID 기반 3D SDF 로딩 함수를 재사용한다.

### 수업용 활동 모드 MVP

- `AppMode = 'free_draw' | 'activity'`
- 자유 그리기 모드와 수업 활동 모드 전환 가능.
- 활동 템플릿은 `apps/workbench/src/data/activityTemplates.ts`에 정의.
- 학생 예측값과 RDKit.js 검증값을 단순 문자열 비교로 표시한다.
- 자동 점수화는 구현하지 않았다.

초기 활동:

- 물 분자 구조 그리기
- 메테인 분자 구조 그리기
- 암모니아 분자 구조 그리기
- 에탄올 분자 구조 그리기
- 벤젠 분자 구조 그리기

### VSEPR Engine MVP

- `apps/workbench/src/services/vseprEngine.ts`
- RDKit.js 검증 성공 후 Ketcher의 V2000 MOL block을 파싱한다.
- 중심 원자 후보를 찾고, 결합 전자쌍 영역 수와 비공유 전자쌍 수를 추정한다.
- 결과로 AXE 표기, 전자쌍 배열, 분자 구조, 예상 결합각, 신뢰도, 경고를 반환한다.

지원 AXE 구조:

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

주의:

- 에탄올처럼 중심 원자가 여러 개인 분자는 전체 분자를 하나의 VSEPR 구조로 단정하지 않는다.
- 중심 원자별 국소 VSEPR 분석을 수행한다.
- 전이금속, 라디칼, 복잡한 공명 구조는 unsupported 또는 low confidence로 처리한다.

### VSEPR 예측 모형 3D Viewer

- `apps/workbench/src/services/vseprGeometryTemplates.ts`
- `apps/workbench/src/components/Vsepr3DModelViewer.tsx`
- VSEPR 분석 결과의 AXE 표기에 맞는 교육용 단위 벡터 template을 사용한다.
- 중심 원자, 결합 방향, 결합 원자, 비공유 전자쌍 방향을 3Dmol.js로 표시한다.
- 실제 3D 좌표 데이터와 명확히 분리하여 `VSEPR 예측 모형`으로 표시한다.
- 비공유 전자쌍은 실제 입자가 아니라 전자쌍 방향 이해를 위한 시각화이다.

최근 수정:

- NH3가 `AX3E1`로 잘못 표시되어 VSEPR template 매핑에 실패하던 문제를 수정했다.
- 현재 암모니아는 `AX3E`, `삼각뿔형`, 예상 결합각 `<109.5°`로 표시된다.
- VSEPR 3D 모형도 자동 표시된다.
- Claude VSEPR prototype의 표준 예제 범위를 검토하여 Be/B/Xe 중심 원자, terminal ligand 구조의 중심 원자 자동 선택, `AXmE0`/`AXmE1` alias 호환을 추가했다. 에너지 최소화 solver는 MVP 정책과 충돌하므로 런타임에 통합하지 않았다.
- VSEPR은 핵심 자유 그리기 흐름에서 분리했다. 자유 그리기 기본 화면에서는 선택 교육 모듈 안내와 열기 버튼만 보이고, 수업 활동 또는 사용자가 명시적으로 연 경우에만 VSEPR 패널과 VSEPR 3D 예측 모형을 표시한다.

### 학생용/교사용 모드 분리 MVP

- `UserMode = 'student' | 'teacher'`
- 로그인 없이 상단 버튼으로 학생 모드와 교사 모드를 전환한다.

학생 모드 표시:

- 활동 선택
- 학습 목표
- 분자 구조 그리기
- 예측 입력
- RDKit 검증 결과
- VSEPR 분석 결과
- 실제/외부 3D Viewer
- VSEPR 예측 모형 Viewer
- PubChem 후보 검색
- 정리 문항

학생 모드에서 숨김:

- 개발자 로그
- HTTP status 세부 정보
- 원본 API 응답
- 교사용 해설
- 내부 타입 정보

교사 모드 표시:

- 선택된 활동 템플릿 정보
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

## 4. 주요 파일 구조

```text
apps/workbench/
  src/
    app/
      App.tsx
      App.test.tsx
    components/
      header/AppHeader.tsx
      ketcher/KetcherEditor.tsx
      Molecule3DViewer.tsx
      Vsepr3DModelViewer.tsx
      TeacherPanel.tsx
      activity/ActivityPanel.tsx
      pubchem/PubChemCandidatePanel.tsx
      validation/ValidationLogPanel.tsx
      vsepr/VseprPanel.tsx
    data/
      exampleMolecules.ts
      activityTemplates.ts
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
  package.json
docs/
  TDD_DRAFT.md
  ROADMAP.md
  LIBRARY_DECISION_LOG.md
  THREE_D_DATA_POLICY.md
  PUBCHEM_MATCHING_POLICY.md
  VSEPR_ENGINE_POLICY.md
  TEACHER_STUDENT_MODE_POLICY.md
  RDKIT_VALIDATION_CHECKLIST.md
  EDUCATION_USE_CASES.md
```

## 5. 실행 방법

PowerShell 기준:

```powershell
cd C:\all\molecule-modeling-skill-package\apps\workbench
npm install
npm run dev
```

브라우저:

```text
http://127.0.0.1:5173
```

빌드:

```powershell
npm run build
```

타입 검사:

```powershell
npx tsc --noEmit
```

테스트:

```powershell
npm test -- --run
```

## 6. 최근 검증 결과

2026-06-30 기준 확인한 결과:

- `npx tsc --noEmit`: 통과
- VSEPR 관련 Vitest: 4개 파일, 17개 테스트 통과
- `npm run build`: 통과
- 브라우저 수동/자동 확인:
  - 암모니아 예제 선택
  - RDKit.js 결과 `H3N`, 평균 분자량 표시
  - VSEPR 결과 `AX3E`, `삼각뿔형`, `<109.5°` 표시
  - VSEPR 3D 예측 모형 canvas 생성 확인

빌드 경고:

- 3Dmol.js 번들에서 `eval` 사용 경고가 나온다.
- 일부 chunk 크기가 500 kB를 초과한다.
- 현재 prototype 단계에서는 기능 차단 이슈는 아니지만, 배포 최적화 전 검토가 필요하다.

## 7. 현재 상태와 미커밋 주의

마지막 커밋:

```text
e82371b feat: add VSEPR educational geometry engine MVP
```

그 이후 작업 중인 변경이 남아 있다.

주요 미커밋 작업:

- VSEPR 3D 예측 모형 Viewer
- 학생/교사 모드 분리
- TeacherPanel
- ValidationLogPanel 표시 조건 변경
- 활동 템플릿 교사용 정보 확장
- NH3 VSEPR `AX3E1` 오류 수정
- Ketcher 내부 3D Viewer 버튼 숨김

커밋 전에는 전체 diff를 확인하고, 의도하지 않은 `.test_runs` 산출물이나 영상 파일 포함 여부를 확인해야 한다.

## 8. 구현하지 않은 기능

현재 일부러 구현하지 않은 기능:

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
- 결합각/결합길이 정밀 계산
- PubChem 결과를 RDKit 검증값 대신 표시하는 기능

## 9. 실패 가능성이 높은 지점

- Ketcher가 내보내는 MOL block에서 수소가 생략될 때 VSEPR 엔진이 implicit hydrogen을 교육용 규칙으로 추정한다. 단순 분자에는 유용하지만 복잡한 구조에서는 신뢰도가 낮아질 수 있다.
- VSEPR 엔진은 주족 원소와 단순 구조 중심 MVP이다. 전이금속, 라디칼, 복잡한 공명 구조는 unsupported로 처리해야 한다.
- PubChem 후보 검색은 외부 네트워크와 PubChem 응답 상태에 의존한다.
- 3Dmol.js 번들 크기가 크고, 빌드 시 경고가 있다.
- VSEPR 예측 모형과 PubChem 실제/외부 3D 구조를 학생이 혼동하지 않도록 UI 라벨을 계속 엄격히 유지해야 한다.

## 10. 다음 작업 제안

우선순위 높은 다음 단계:

1. 현재 미커밋 변경 정리 및 커밋
2. 학생/교사 모드 4가지 조합 재검증
   - `free_draw + student`
   - `free_draw + teacher`
   - `activity + student`
   - `activity + teacher`
3. VSEPR 선택 모듈이 자유 그리기 기본 흐름을 방해하지 않는지 수업 사용자 테스트
4. VSEPR 예측 모형의 카메라/회전 UX 개선
5. 물, 메테인, 암모니아, 이산화탄소, 에탄올에 대한 VSEPR 비교 시나리오 테스트 고정
6. 교사용 활동 template 편집/import/export 설계
7. 수업 적용 전 개인정보/보안/과학 정확성 검토 문서 보강

나중 단계:

- 학생 저장 기능
- 교사 대시보드
- 활동 결과 내보내기
- 배포 최적화
- 더 넓은 화학 파일 import/export

## 11. ChatGPT 프로젝트에 넘길 때 핵심 지시문

다음 원칙은 계속 유지해야 한다.

```text
ChemDraw 전체 복제를 목표로 하지 않는다.
1차 목표는 수업용 ChemDraw-like 분자구조 편집기 MVP이다.
화학 계산과 구조 검증은 반드시 RDKit.js 같은 검증 도구를 통과해야 한다.
Ketcher는 2D 입력기, RDKit.js는 검증/계산기, 3Dmol.js는 시각화기, VSEPR Engine은 교육용 예측기로 분리한다.
검증되지 않은 값은 학생에게 계산 결과처럼 보여주지 않는다.
VSEPR 결과는 실제 실험 구조나 최적화 conformer가 아니라 교육용 예측 모형이다.
PubChem 3D 구조와 VSEPR 예측 모형은 UI와 데이터 흐름에서 분리한다.
VSEPR은 기본 자유 그리기 핵심 기능이 아니라 수업 활동 또는 명시적으로 여는 선택 교육 모듈로 유지한다.
```

## 12. 검토 필요

| 항목 | 이유 | 확인 방법 | 상태 |
|---|---|---|---|
| 수업 적용 전 과학 정확성 검토 | VSEPR implicit hydrogen 추정과 단순 AXE 매핑은 MVP 규칙임 | 교사용 예제별 검토, 화학 교과서 기준 대조 | 검토 필요 |
| 3Dmol.js 번들 경고 | chunk 크기와 eval 경고가 있음 | 배포 전 번들 분석 및 lazy loading 전략 검토 | 검토 필요 |
| PubChem 네트워크 실패 UX | 외부 API 의존 | 네트워크 차단, CID no data, HTTP error 시나리오 테스트 | 검토 필요 |
| 교사용 정보 노출 | 학생 모드에 교사용 해설이 나오면 안 됨 | student/teacher 모드별 화면 테스트 | 검토 필요 |
| 미커밋 산출물 | `.test_runs`, 영상 파일 등 포함 가능 | `git status --short`와 staged diff 확인 | 검토 필요 |
| Claude VSEPR prototype 반영 범위 | 일부 규칙만 채택했고 에너지 최소화 solver는 제외함 | `docs/CLAUDE_VSEPR_ENGINE_REVIEW.md`와 회귀 테스트 확인 | 검토 필요 |
