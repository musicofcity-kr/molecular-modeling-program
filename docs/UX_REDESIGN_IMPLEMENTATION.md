# UX Redesign Implementation

- 작성일: 2026-07-27
- 대상 앱: `apps/workbench`
- 기준 문서: `CODEX 분자구조모델링 메타프롬프트.md`
- 비교 기준: `docs/UX_REDESIGN_BASELINE.md`
- 구현 상태: **미커밋 working tree, 로컬 통합 QA 완료**
- 배포 상태: **프로덕션 미배포**

## 1. 문서 범위

이 문서는 기준 커밋 `905b622e74727a70b8f4804bab456d55cd682775` 이후
working tree에 구현된 UX·화학 안전성 변경과 2026-07-27 로컬 검증 결과를
기록한다. 로컬 release candidate와 실제 production 배포 완료는 구분한다.

- 구현 내용과 정적 테스트 계약: 현재 diff 기준으로 기록
- baseline 화면: `docs/qa-screenshots/baseline/` PNG 4장
- final 화면: `docs/qa-screenshots/final/` PNG 6장
- 최종 점수와 결함 종결: `docs/QA_SCORECARD.md`
- 명령·환경·잔여 한계: `docs/QA_TEST_REPORT.md`

새 production dependency는 추가하지 않았다. Ketcher 간편 모드는 기존
`ketcher-react`의 공개 `ButtonsConfig`를 사용하므로 라이선스와 정적 배포
구성은 바뀌지 않는다.

## 2. 구현 후 학생 흐름

```text
윤리 가이드
  → 학생 수업방 입장
  → 1. 분자 선택
  → 2. 구조 만들기
  → 3. 구조 분석
  → 4. 참고 3D / VSEPR 예상 모형 비교
  → 5. 근거 작성·교사 제출·반환 피드백 확인
```

데스크톱에서는 다섯 단계가 한 작업 화면 안에 유지되며 상단 진행 표시로
이동한다. 모바일에서는 현재 단계에 해당하는 영역 하나를 표시하고 하단 고정
5탭으로 전환한다. 단계는 잠그지 않으며 완료·검토 필요·오류 상태는 실제
검증·3D·작성 상태로 계산한다.

## 3. P0 요구사항 추적

| 메타프롬프트 요구 | working tree 구현 | 주요 파일 | 현재 증거 | 남은 검증 |
|---|---|---|---|---|
| 7.1 시각적 5단계 흐름 | 자유 이동 진행 표시, 실제 상태 기반 `current/completed/review/error`, 명시적 분석 성공 후 이동, 모바일 축약 5탭 | `StudentLearningProgress.tsx`, `StudentActivityShell.tsx`, `global.css` | E3 컴포넌트·Playwright | 실기기 스크린리더는 운영 전 수동 확인 |
| 7.2 간편/고급 편집 | Ketcher `ButtonsConfig`로 반응식·R-group·텍스트 등 고급 도구를 기본 숨김, 모드 전환·구조 복원·실패 복구 추가 | `KetcherEditor.tsx`, `editorModeRecovery.ts`, `MoleculeDrawingStep.tsx` | E3 구조 보존 Playwright·단위 테스트 | 강제 `onInit` 실패 브라우저 주입은 저위험 잔여 |
| 7.3 버튼 위계 | `예시 구조 불러오기`, `구조 초기화`, `2D 구조 분석하기`, 분석·제출 중 중복 실행 방지 | `MoleculeDrawingStep.tsx`, `App.tsx` | E3 정상·오류·지연 E2E | 없음 |
| 7.4 VSEPR 근거표 | 중심 원자, 결합 전자 영역, 비공유 전자쌍, 전체 전자 영역, 전자쌍 배열, 분자 구조, 예상 결합각 순으로 분리 | `ValidationResultCards.tsx`, `VseprPanel.tsx` | E3 H2O·CH4·NH3 E2E와 단위 테스트 | 지원 밖 구조는 확정값 대신 검토 안내 |
| 7.5 두 3D 모형 구분 | 두 열 비교, 모바일 명시적 선택 버튼, 비교 질문, 전자쌍/원자 보기, 비공유 전자쌍 토글, 초기 방향·화면 맞추기, 제스처 안내 | `ShapeViewerSection.tsx`, `Molecule3DViewer.tsx`, `Vsepr3DModelViewer.tsx` | E3 데스크톱·Pixel 5 touch E2E | 물리 기기의 운영체제 제스처 차이는 수동 확인 |
| 7.6 결과 정보 위계 | 분석 성공, 분자식, 중심 원자, 전자 영역, 배열, 분자 구조를 먼저 표시하고 평균 분자량·AXE·3D 제공 여부는 `기타 정보`로 이동 | `ValidationResultCards.tsx` | E3 렌더·스크린샷 | 200% 확대와 실제 스크린리더는 운영 전 수동 확인 |
| 7.7 학습형 오류·회복 | 명시적 4xx 거절과 인프라 장애 분리, 입력 오류 연결, MOL/SMILES 불일치·query/전하/동위원소/라디칼·외부 3D 불일치 차단 | 입장·RDKit·PubChem·VSEPR 서비스 | E3 필수 오류·세션 격리 E2E와 적대 단위 테스트 | live WAF/CDN 응답은 배포 후 확인 |
| 7.8 모바일 전용 설계 | 하단 5탭, safe-area 여백, 44px 이상 주요 조작, Ketcher·3D 전용 높이, `touch-action: none`, 가로 overflow 방지, reduced motion 유지 | `global.css`, `StudentLearningProgress.tsx`, `ShapeViewerSection.tsx` | E3 390×844 touch·844×390·PNG | 실제 소프트 키보드와 200% 확대는 수동 확인 |
| 7.9 수업 집중 모드 | 이번 diff에서 신규 교사 설정 UI는 추가하지 않음 | 기존 activity/template 경계 유지 | E1 구조 | P1로 별도 설계 |

## 4. 세부 구현

### 4.1 단계형 정보 구조

`StudentLearningProgress`가 다섯 단계를 한 곳에서 정의한다.

- 현재 단계: `aria-current="step"`
- 완료: 체크와 `완료` 텍스트
- 검토 필요·오류: 색상과 상태 텍스트를 함께 사용
- 이동: 버튼 선택 후 대상 섹션으로 스크롤하고 섹션에 포커스
- 잠금: 없음
- 모바일: `선택 / 그리기 / 분석 / 3D / 기록` 하단 탭

`StudentActivityShell`은 분석 요약과 VSEPR 근거표를 3단계에, 두 3D 모형과
비교 질문을 4단계에, 생각 작성과 교사 피드백을 5단계에 배치한다.

### 4.2 Ketcher 편집

간편 모드는 CSS로 도구를 강제 은폐하지 않고 Ketcher 설정으로 고급 기능을
숨긴다. 고급 모드는 기존 편집 기능을 다시 노출하며 3D Viewer 버튼만 앱의
별도 3D 학습 흐름과 중복되어 숨긴다.

학생 행동은 다음과 같이 정리했다.

- 예시 구조 불러오기
- 구조 초기화
- 2D 구조 분석하기
- 간편 모드 / 고급 편집 모드 전환

예시 불러오기와 구조 분석 중에는 같은 작업의 중복 실행을 막는다. 구조
초기화는 Ketcher 구조와 파생 검증·3D 상태를 함께 초기화한다.

### 4.3 분석 결과와 VSEPR 근거

분석 결과 첫 화면에는 검증된 값만 표시한다. VSEPR 근거표는 `결합 원자 수`를
교육적 의미가 명확한 `결합 전자 영역 수`로 바꾸고 전자쌍 배열과 분자 구조를
분리한다.

지원되지 않거나 검증되지 않은 구조는 확정값 대신 대기·검토 메시지를 표시한다.
평균 분자량, AXE 표기, 3D 제공 여부는 접힌 `기타 정보`로 이동했다.

### 4.4 3D 비교

참고 3D 구조와 VSEPR 예상 모형은 별도 열과 별도 설명을 유지한다.

- 참고 3D: 공-막대·막대·공간 채움 모형 명칭, 초기 방향, 화면 맞추기
- VSEPR: 전자쌍 배열 보기, 원자만 보기, 비공유 전자쌍 표시, 라벨 표시,
  초기 방향, 화면 맞추기
- 공통: 한 손가락 회전·두 손가락 확대 안내
- 비교: 원자 배열, 비공유 전자쌍 표현, 이론 모형과 참고 자료 차이를 묻는 질문
- 모바일: 두 모형을 한 번에 세로 적층하지 않고 명시적 버튼으로 선택

`touch-action: none`과 `overscroll-behavior: contain`을 3D host에 적용해 뷰어
제스처와 페이지 스크롤의 충돌을 줄였다.

### 4.5 생각 작성과 반환 피드백

생각 작성 안내는 두 모형의 공통점·차이점과 전자 영역 근거를 요구하도록
구체화했다. 1,000자 제한과 현재 글자 수를 제공하고 도움말을 textarea에
연결했다.

새 `StudentReturnedFeedback`은 제출한 활동의 교사 피드백과 반환 시각을
학생 화면에서 확인하도록 기존 피드백 조회 흐름을 연결한다. 실제 Firebase
인증·반환 왕복은 최종 회귀 검증 대상이다.

### 4.6 입장 오류와 접근성

학생 입장 입력은 공통 오류 메시지와 `aria-describedby`로 연결되고 오류 시
`aria-invalid`를 사용한다. 오류 영역은 `role="alert"`,
`aria-live="assertive"`로 알린다.

신뢰 endpoint가 4xx로 수업코드·입장 확인코드를 거절하면 학생 세션을 만들지
않는다. 서버 5xx 또는 네트워크 실패는 기존 브라우저 활동 지속 정책을
유지하므로, 잘못된 코드와 일시 장애를 구분한다.

CSS는 주요 버튼·선택 UI에 최소 44px 높이, 공통 `:focus-visible`, 모바일
safe-area 하단 여백을 제공한다. 자동화된 포커스 순서와 touch 흐름은
통과했으며, 물리 스크린리더·운영체제 소프트 키보드·200% 확대는 운영 전
수동 검토 항목이다.

## 5. 화학 안전 경계

| 경계 | 구현 | 실패 시 행동 |
|---|---|---|
| Ketcher MOL/SMILES 일치 | 두 입력이 함께 있으면 RDKit canonical SMILES로 교차검증 | 불일치 시 `ok: false`, 결과·3D 차단, 다시 불러오기/그리기 안내 |
| 외부 3D 후보 일치 | RDKit canonical SMILES와 PubChem 후보를 비교 | 분자식이 같아도 구조 문자열이 다르면 3D 로드 차단 |
| 라디칼 | V2000 `M  RAD` 탐지 | `unsupported`, 신뢰도 low, 교육용 VSEPR 범위 밖 안내 |
| Be 분자식 | 원자번호 4를 `Be`로 매핑 | BeCl2 분자식과 canonical SMILES 회귀 테스트 |
| 기준 분자 | 메타프롬프트의 13종 VSEPR 결과를 테이블 테스트 | 지원 범위 밖 구조를 억지로 확정하지 않음 |
| RDKit 자원 | MOL과 SMILES에서 만든 두 `JSMol`을 `finally`에서 해제 | 반복 검증 시 메모리 누수 위험 완화 |

13종은 BeCl2, CO2, HCN, BF3, BCl3, CH2O, CH4, CCl4, CH3Cl, NH3,
PCl3, H2O, H2S이다. 추가로 strict V2000 counts-line, query 속성,
PubChem 구조 일치, Ketcher 이중 표현 일치와 자원 해제를 적대 테스트로
검증했다. 정확한 전체 실행 수는 `docs/QA_TEST_REPORT.md`에 기록한다.

## 6. 테스트 변경과 증거 범위

### 6.1 추가·갱신된 자동화

- 학생 5단계 진행 표시와 자유 이동 렌더링 계약
- 핵심 결과 정보 위계와 VSEPR 근거 필드
- VSEPR 3D 보기 방식·비공유 전자쌍·리셋 제어
- 학생 입장 오류 연결
- 수업방 4xx 거절과 5xx/네트워크 지연 정책 분리
- Ketcher MOL/SMILES 불일치
- PubChem canonical SMILES 불일치
- 라디칼 unsupported와 기준 분자 13종
- BeCl2 분자식
- 네 viewport H2O 화면과 문서 가로 overflow 1px 이하

### 6.2 viewport evidence harness

`apps/workbench/e2e/ux-redesign.spec.ts`는 다음 viewport를 순회한다.

| 이름 | viewport | 확인 |
|---|---:|---|
| desktop | 1440×900 | 검증된 H2O 화면의 핵심 세 영역과 가로 overflow |
| notebook | 1280×800 | 동일 |
| tablet | 768×1024 | 동일 |
| mobile | 390×844 | 동일 |

`UX_SCREENSHOT_SET` 환경값이 있으면
`docs/qa-screenshots/<set>/`에 full-page PNG를 저장한다.
`baseline/`은 개선 전 비교 자료이고 `final/`에는 현재 화면 6장이 있다.

### 6.3 최종 로컬 검증

- typecheck, 전체 unit, production build 통과
- Playwright 30개 통과: H2O, CH4·NH3·H2O 비교, 빈 구조, 잘못된 코드,
  인프라 장애, 3D 없음, 제출 조건·실패·중복 방지, 학생·교사 세션 격리
- Ketcher 간편/고급 전환 후 정확한 KET 구조 보존과 다음 편집 감지
- Pixel 5 touch context의 5단계 완료, 3D touch drag, 제출
- Firestore Rules emulator 17개 통과
- final PNG 6장 생성 및 육안 확인

실제 Firebase/Vercel 배포, 실기기 소프트 키보드, 물리 스크린리더와 200%
확대는 로컬 자동화로 대체하지 않았으며 production 승인 전 수동 게이트다.

## 7. 변경 파일 지도

| 영역 | 파일 |
|---|---|
| 앱 조립·상태 | `src/app/App.tsx`, `src/contexts/UserSessionContext.tsx` |
| 학생 흐름 | `StudentActivityShell.tsx`, `StudentLearningProgress.tsx`, `MoleculeDrawingStep.tsx`, `ValidationResultCards.tsx`, `ShapeViewerSection.tsx`, `StudentThoughtSubmission.tsx`, `StudentReturnedFeedback.tsx` |
| 입장 | `StudentEntryScreen.tsx`, `classroomJoinService.ts` |
| 2D·3D | `KetcherEditor.tsx`, `Molecule3DViewer.tsx`, `Vsepr3DModelViewer.tsx`, `VseprPanel.tsx` |
| 화학 서비스 | `molecularFormula.ts`, `rdkitService.ts`, `pubchemSearch.ts`, `vseprEngine.ts` |
| 반응형·접근성 | `src/styles/global.css` |
| 자동화 | 관련 `*.test.ts(x)`, `e2e/ux-redesign.spec.ts` |

## 8. 완료 판정

현재 diff는 로컬 release candidate 기준으로 typecheck, unit, build,
Playwright, Firestore Rules, 화면 증거를 통과했다. 독립 적대감사에서 발견한
Critical/High는 수정 후 재검증했고 `docs/QA_SCORECARD.md` 기준 상한은
비활성이다. production 배포·실데이터 처리는 별도 승인과 운영 검토 전까지
완료로 선언하지 않는다.
