# CODEX_FEEDBACK.md

## [Phase 0] 준비 — 2026-07-06
- 변경 파일:
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 검증: typecheck ✅ | test 237/237 ✅ | build ✅
- 실행 로그 요약:
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 44 files / 237 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
- 신규 테스트: 없음
- mock 경계 목록: 해당 없음
- 미해결/보류: 없음
- 다음 단계 착수 가능: 가능

## [Phase 1] LICENSE + README 공개품질 — 2026-07-06
- 변경 파일:
  - `LICENSE`
  - `README.md`
  - `docs/readme-assets/student-activity-overview.png`
  - `docs/readme-assets/shape-viewer-section.png`
  - `docs/readme-assets/teacher-mode.png`
- 검증: typecheck ✅ | test 237/237 ✅ | build ✅
- 실행 로그 요약:
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 44 files / 237 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
- 신규 테스트: 없음
- mock 경계 목록: 해당 없음
- 미해결/보류: 라이브 데모 URL은 실제 확정 전까지 README에 TODO placeholder 유지
- 다음 단계 착수 가능: 가능

## [Phase 2] GitHub Actions CI — 2026-07-06
- 변경 파일:
  - `.github/workflows/ci.yml`
  - `README.md`
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 검증: typecheck ✅ | test 237/237 ✅ | build ✅
- 실행 로그 요약:
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 44 files / 237 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
- 신규 테스트: 없음
- mock 경계 목록: 해당 없음
- 미해결/보류: GitHub Actions 녹색 URL은 브랜치 push 후 확인 가능
- 다음 단계 착수 가능: 가능

## [Phase 3] R1 디자인 토큰 기반 안정화 — 2026-07-06
- 변경 파일:
  - `apps/workbench/src/styles/global.css`
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 검증: typecheck ✅ | test 237/237 ✅ | build ✅ | 금지 색상 grep ✅
- 실행 로그 요약:
  - `rg "#21313a|#34464d|#42636c"`: 결과 없음
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 44 files / 237 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
- 신규 테스트: 없음
- mock 경계 목록: 해당 없음
- 미해결/보류: Gmarket Sans 웹폰트는 외부 CDN 로딩 실패 시 Pretendard/system fallback으로 동작
- 다음 단계 착수 가능: 가능

## [Phase 4] R2 위저드 전환 — 2026-07-06
- 변경 파일:
  - `apps/workbench/src/app/App.tsx`
  - `apps/workbench/src/app/App.test.tsx`
  - `apps/workbench/src/components/student/ActivityPicker.tsx`
  - `apps/workbench/src/components/student/CollapsibleStudentStep.tsx`
  - `apps/workbench/src/components/student/LearningProgressRail.tsx`
  - `apps/workbench/src/components/student/MoleculeDrawingStep.tsx`
  - `apps/workbench/src/components/student/PredictionStep.tsx`
  - `apps/workbench/src/components/student/ReflectionStep.tsx`
  - `apps/workbench/src/components/student/ShapeViewerSection.tsx`
  - `apps/workbench/src/components/student/StudentActivityShell.tsx`
  - `apps/workbench/src/components/student/StudentActivityShell.test.tsx`
  - `apps/workbench/src/components/student/ValidationResultCards.tsx`
  - `apps/workbench/src/styles/global.css`
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 승인 게이트 기록:
  - 상태 소유: `App.tsx`가 명시적 `currentLearningStep` 상태를 소유하고 `StudentActivityShell`에 전달한다. `free_draw`에서는 위저드와 레일을 적용하지 않는다.
  - `student-step-N` 영향: 1~5단계는 `components/student/*`, 6단계는 `StructureComparisonPanel`, 7단계는 `ActivityResultPanel`, 레일 targetId와 CSS focus/scroll 스타일, `App.test.tsx` SSR 기대값에 의존한다.
  - 기존 테스트 수정 사유: 학생 활동 SSR 테스트가 7단계 전체 렌더를 전제했으므로 1단계 단일 스테이지 렌더 계약으로 갱신했다.
- 검증: typecheck ✅ | test 244/244 ✅ | build ✅ | 금지 색상/작은 px grep ✅
- 실행 로그 요약:
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 45 files / 244 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
  - `rg "font-size:\s*([0-9]|1[01])px|#21313a|#34464d|#42636c"`: 결과 없음
- 신규 테스트: `src/components/student/StudentActivityShell.test.tsx` 7개 케이스
- mock 경계 목록: 해당 없음
- 미해결/보류: 브라우저 클릭형 1→7 반복 QA는 Phase 10 Playwright E2E에서 정식 자동화 예정
- 다음 단계 착수 가능: 가능

## [Phase 5] R3 불꽃 레일 — 2026-07-06
- 변경 파일:
  - `apps/workbench/src/app/App.tsx`
  - `apps/workbench/src/app/App.test.tsx`
  - `apps/workbench/src/components/student/LearningProgressRail.tsx`
  - `apps/workbench/src/components/student/LearningProgressRail.test.tsx`
  - `apps/workbench/src/styles/global.css`
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 검증: typecheck ✅ | test 247/247 ✅ | build ✅ | scroll anchor 제거 grep ✅
- 실행 로그 요약:
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 46 files / 247 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
  - `rg "scrollIntoView|targetId"`: 레일에서 결과 없음
- 신규 테스트: `src/components/student/LearningProgressRail.test.tsx` 3개 케이스
- mock 경계 목록: 해당 없음
- 미해결/보류: 실제 키보드 포커스 순환은 Phase 10 Playwright E2E에서 브라우저 이벤트로 보강 예정
- 다음 단계 착수 가능: 가능

## [Phase 6] R4 검증 비교 카드 — 2026-07-06
- 변경 파일:
  - `apps/workbench/src/components/student/StudentActivityShell.tsx`
  - `apps/workbench/src/components/student/ValidationResultCards.tsx`
  - `apps/workbench/src/components/student/ValidationResultCards.test.tsx`
  - `apps/workbench/src/styles/global.css`
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 검증: typecheck ✅ | test 250/250 ✅ | build ✅ | 금지 어휘 grep ✅
- 실행 로그 요약:
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 47 files / 250 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
  - `rg "오답|틀림"`: 구현 코드에는 없음, 테스트의 부정 assertion에만 존재
- 신규 테스트: `src/components/student/ValidationResultCards.test.tsx` 3개 케이스
- mock 경계 목록: 해당 없음
- 미해결/보류: 없음
- 다음 단계 착수 가능: 가능

## [Phase 7] R5 리디자인 마감 QA — 2026-07-06
- 변경 파일:
  - `.gitignore`
  - `apps/workbench/src/styles/global.css`
  - `docs/qa/phase7/phase7-student-375.png`
  - `docs/qa/phase7/phase7-student-768.png`
  - `docs/qa/phase7/phase7-student-1440.png`
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 검증: typecheck ✅ | test 250/250 ✅ | build ✅ | 3개 뷰포트 스크린샷 ✅ | 작은 폰트/구 회청색 grep ✅
- 실행 로그 요약:
  - `rg "font-size:\s*1[01]px|font-size:\s*[0-9]px|#21313a|#34464d|#42636c"`: 결과 없음
  - Playwright viewport 375/768/1440px: 수평 오버플로우 없음, 위저드 액션 바 표시 확인
  - Playwright 터치 타깃 검사: 보조 법적 링크 3개가 44px 미만으로 발견되어 CSS 보정 후 재검사 결과 0건
  - Playwright 학생 흐름: 윤리 게이트 → 학생 입장 → 1단계 → 2단계 입력 → 3단계 Ketcher 표시 → 예제 구조 확인 → 4단계 검증 결과/비교 카드 표시 확인
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 47 files / 250 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
- 신규 테스트: 없음
- mock 경계 목록: 해당 없음
- 미해결/보류:
  - Vite dev 서버에서 5단계 최초 진입 시 `3dmol` 의존성 최적화로 1회 reload가 발생했다. production build 자체는 정상이며, 1→7 전체 브라우저 자동 반복은 Phase 10 Playwright E2E에서 정식 자동화한다.
  - Playwright가 루트에 생성한 임시 스크린샷 파일은 Windows 권한 문제로 즉시 삭제되지 않아 `.gitignore`에 루트 임시 패턴을 추가했고, 커밋 대상 증거 파일은 `docs/qa/phase7/`에 복사했다.
- 다음 단계 착수 가능: 가능

## [Phase 8] P5 Ketcher 로딩 개선 — 2026-07-06
- 변경 파일:
  - `apps/workbench/src/app/App.tsx`
  - `apps/workbench/src/app/App.test.tsx`
  - `apps/workbench/src/styles/global.css`
  - `apps/workbench/vercel.json`
  - `WORK_STATE.md`
  - `CODEX_FEEDBACK.md`
- 검증: typecheck ✅ | test 251/251 ✅ | build ✅ | vercel.json parse ✅
- 실행 로그 요약:
  - `App.tsx`: Ketcher는 기존 `React.lazy` + `Suspense` 구조 유지, wrapper API 변경 없음
  - 로딩 UI: "분자 편집기를 불러오는 중입니다 (최초 1회, 네트워크에 따라 수십 초 소요될 수 있습니다)" 안내와 reduced-motion 대응 스피너 추가
  - `vercel.json`: `/assets/(.*)`에 `Cache-Control: public, max-age=31536000, immutable` 추가
  - dist 청크 비교: Phase 7 `KetcherEditor-5nUMKVts.js` 23,892.02kB(gzip 6,963.15kB) → Phase 8 `KetcherEditor-BhiV3Y7M.js` 23,892.02kB(gzip 6,963.15kB)
  - `npm run typecheck`: `tsc -b` 통과
  - `npm test`: 47 files / 251 tests passed
  - `npm run build`: Vite production build 성공, 기존 3Dmol eval 및 대용량 chunk 경고 유지
  - `node -e "JSON.parse(...vercel.json...)"`: `vercel.json OK`
- 신규 테스트: `src/app/App.test.tsx` 1개 케이스 — Ketcher loading fallback 문구 검증
- mock 경계 목록: 해당 없음
- 미해결/보류: Ketcher 번들 크기 자체는 변경하지 않았다. 지침상 교체/fork/수동 트리셰이킹은 금지되어 있고, 근본 번들 개선은 별도 연구 과제다.
- 다음 단계 착수 가능: 가능
