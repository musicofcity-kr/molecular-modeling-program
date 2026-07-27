# UX Redesign Changelog

- 작성일: 2026-07-27
- 상태: **Unreleased / working tree**
- 기준 커밋: `905b622e74727a70b8f4804bab456d55cd682775`
- 프로덕션 배포: 없음

## 2026-07-27

### Added

- 학생용 5단계 탐구 진행 표시
  - 분자 선택
  - 구조 만들기
  - 구조 분석
  - 3D 비교
  - 생각 정리·제출
- 모바일 하단 고정 5탭과 브라우저 safe-area 여백
- Ketcher 학생용 간편 모드와 고급 편집 모드
- 구조 초기화 동작
- VSEPR 근거표의 중심 원자·전자 영역·전자쌍 배열·분자 구조·예상 결합각
- 모바일 VSEPR/참고 3D 선택 버튼
- VSEPR 전자쌍 배열 보기, 원자만 보기, 비공유 전자쌍 표시, 초기 방향,
  화면 맞추기 제어
- 두 모형의 공통점·차이점을 묻는 비교 질문
- 학생 화면의 반환 교사 피드백 영역
- 네 viewport H2O 화면과 가로 overflow를 확인하는 Playwright harness
- BeCl2 분자식 단위 테스트
- 메타프롬프트 기준 분자 13종 VSEPR 회귀 테스트

### Changed

- 학생 화면을 단일 긴 작업 목록에서 단계 상태가 보이는 학습 흐름으로 재구성
- 분석 완료 후 구조 분석 단계로 안내
- `분자 예시 불러오기`를 `예시 구조 불러오기`로 변경
- `내 구조 확인하기`를 `2D 구조 분석하기`로 변경
- 분석 중 버튼 문구를 `2D 구조 분석 중`으로 변경하고 중복 실행 방지
- 평균 분자량·AXE 표기·3D 제공 여부를 접힌 `기타 정보`로 이동
- 전자쌍 배열과 분자 구조를 서로 다른 결과 필드로 분리
- VSEPR 근거 패널과 예상 모형 뷰어를 분리
- 실제 3D 표현 방식을 공-막대·막대·공간 채움 모형의 한국어 명칭으로 변경
- 생각 작성 안내를 모형 비교와 전자 영역 근거 중심으로 변경
- 생각 작성에 1,000자 제한과 글자 수 안내 추가
- 모바일에서는 현재 단계 하나와 선택한 3D 모형 하나를 표시하도록 변경
- 주요 조작의 최소 높이, 포커스 표시, Ketcher·3D 모바일 최소 높이 강화

### Fixed

- 신뢰 endpoint의 4xx 수업방 거절이 local fallback 성공으로 바뀌던 문제
- 학생 입장 입력과 오류 메시지의 접근성 연결 부족
- Ketcher MOL block과 SMILES가 다른 구조를 가리켜도 결과를 계산할 수 있던 경계
- 분자식이 같지만 canonical SMILES가 다른 PubChem 후보를 3D로 불러올 수 있던 경계
- 라디칼 구조에 확정적인 VSEPR 결과를 제시할 수 있던 경계
- Be 원자번호가 분자식 변환 표에 없어 BeCl2 표시가 누락될 수 있던 문제
- 분석·예시 불러오기 중 중복 요청 가능성

### Chemistry safety

- RDKit 검증 전에는 계산 결과와 3D를 확정하지 않는 기존 게이트 유지
- Ketcher MOL/SMILES 불일치는 결과를 차단하고 인간 검토를 요청
- PubChem canonical SMILES 불일치는 외부 3D 로드를 차단
- `M  RAD` 구조는 `unsupported`와 low confidence로 처리
- MOL과 SMILES 교차검증에서 생성한 RDKit 객체를 모두 해제
- 기준 분자 13종:
  BeCl2, CO2, HCN, BF3, BCl3, CH2O, CH4, CCl4, CH3Cl, NH3, PCl3,
  H2O, H2S

### Tests and evidence

- 컴포넌트 테스트 갱신:
  5단계 흐름, 결과 위계, VSEPR 근거, 3D 제어, 입장 오류 접근성
- 서비스 테스트 갱신:
  수업방 4xx/5xx/네트워크, RDKit 교차검증, PubChem 후보 차단,
  라디칼·query 구조 제한, strict V2000 counts line, 기준 분자 13종,
  학생·교사 세션 격리, AI provider 요청·응답 개인정보 삭제
- 전체 단위 테스트와 정확한 개수는 `docs/QA_TEST_REPORT.md`에 기록
- Playwright 30개 통과, Firestore Rules emulator 17개 통과
- baseline PNG 4장 생성·육안 확인:
  - `docs/qa-screenshots/baseline/desktop-1440x900.png`
  - `docs/qa-screenshots/baseline/notebook-1280x800.png`
  - `docs/qa-screenshots/baseline/tablet-768x1024.png`
  - `docs/qa-screenshots/baseline/mobile-390x844.png`
- final PNG 6장 생성·육안 확인:
  - `desktop-1440x900.png`
  - `notebook-1280x800.png`
  - `tablet-768x1024.png`
  - `mobile-390x844.png`
  - `landscape-844x390.png`
  - `mobile-390x844-touch-completed.png`

baseline PNG는 개선 전 화면이고 final PNG는 현재 working tree의 증거다.

### Mobile touch follow-up

- Playwright의 별도 Pixel 5 context(`isMobile`, `hasTouch`, 390×844)에서 하단 탭과 제출 버튼 `.tap()`, CDP 3D touch drag, Ketcher clear touch를 자동 검증한다.
- Headless 브라우저는 운영체제 소프트 키보드를 띄우지 않으므로 실제 키보드 가림, 실기기 가로 모드, 200% 확대는 수동 검증 항목으로 유지한다.

### Verified locally / pending before production

- 로컬 완료: typecheck, unit, build, 필수 학생·교사 E2E, 390×844 touch,
  844×390 landscape, Firestore Rules, final screenshot, 독립 보안·화학 감사
- production 전 필요: 실제 Firebase/Vercel 환경 변수·claim·endpoint 확인
- production 전 필요: 학교 개인정보 담당자의 AI provider·보유/삭제 정책 검토
- production 전 필요: 실기기 소프트 키보드, 스크린리더, 200% 확대 수동 검증
- 배포·커밋·푸시는 이번 작업에서 수행하지 않음

## File inventory

| 분류 | 변경 파일 |
|---|---|
| 앱 상태·조립 | `App.tsx`, `UserSessionContext.tsx` |
| 학생 UX | `StudentActivityShell.tsx`, `StudentLearningProgress.tsx`, `MoleculeDrawingStep.tsx`, `ValidationResultCards.tsx`, `ShapeViewerSection.tsx`, `StudentThoughtSubmission.tsx`, `StudentReturnedFeedback.tsx` |
| 편집·시각화 | `KetcherEditor.tsx`, `Molecule3DViewer.tsx`, `Vsepr3DModelViewer.tsx`, `VseprPanel.tsx` |
| 입장·서비스 | `StudentEntryScreen.tsx`, `classroomJoinService.ts` |
| 화학 안전 | `molecularFormula.ts`, `rdkitService.ts`, `pubchemSearch.ts`, `vseprEngine.ts` |
| 스타일 | `global.css` |
| 테스트 | 관련 `*.test.ts(x)`, `e2e/ux-redesign.spec.ts`, `e2e/mobile-completed-flow.spec.ts` |

## Compatibility and rollback

- 기존 수업방 문서는 계속 읽고, 새 수업방에는 버전된 join-code salt와
  rate-limit 보조 문서를 추가하는 하위 호환 변경이다.
- Firestore 보안 규칙 자체는 유지했고 emulator 17개로 재검증했다.
- 새 production dependency는 추가하지 않았다.
- 아직 배포되지 않았으므로 운영 rollback은 발생하지 않았다. 배포 전 문제가
  발견되면 working-tree 변경을 선별 보류하고 baseline/final 증거로 비교한다.
