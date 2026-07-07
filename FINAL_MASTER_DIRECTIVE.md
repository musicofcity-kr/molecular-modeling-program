# FINAL MASTER 지침서 — molecular-modeling-program 전체 개선 프로젝트

- 문서 버전: FINAL v1.0 (2026-07-04)
- 대상 저장소: `musicofcity-kr/molecular-modeling-program`
- 발주자: LEE WJ (총괄 컨트롤러) / 수행: 에이전트 체계 (§3)
- 지위: **이 문서 하나가 본 프로젝트의 단일 기준(Single Source of Truth)이다.**
  이 문서에 없는 작업은 수행하지 않는다. 판단이 필요하면 임의 결정하지
  말고 질문 목록으로 정리해 중단한다.
- 참조 문서(시각 사양 상세): `DESIGN_FLAME_RAIL.md` — 리디자인의 색·치수·
  문구는 이 문서가 최종 기준이며, 본 문서와 충돌 시 DESIGN 문서 우선.

---

## 1. 검증된 기준선 (2026-07-04, 클린 환경 Node 22 실측)

작업 전후로 이 기준선 유지 여부를 항상 비교한다.

| 항목 | 실측 결과 |
|---|---|
| `npm run typecheck` | 통과 |
| `npm test` (vitest) | 44개 파일 / **237개 테스트 전부 통과** |
| `npm run build` | 성공. 최대 청크 KetcherEditor 23.9MB (gzip 6.96MB) |
| 규모 | 248개 파일 / TS·TSX 약 26,400줄 / API 함수 7개 / 문서 30개 |
| 결함 | LICENSE 없음 · CI 없음 · README 스크린샷/데모 없음 · 입장코드 FNV-1a 32bit + rate limit 없음 |
| 현재 종합 평가 | 72/100 → 본 프로젝트 완료 시 목표 **85±2** (90+는 후속: 현장 투입 기록·번들 근본 개선) |

**충돌 위험 실측 결과 (사전 분석 완료):**
- 백엔드·DB 충돌: 구조적으로 없음 — 제출 스냅샷 생성 로직·Firestore
  rules 화이트리스트·localStorage 키는 리디자인과 무관. 서버는 스냅샷
  내용 완결성을 검사하지 않음.
- 실제 위험 2곳: ① `App.tsx` 2010행 — 단계가 데이터 존재로 역산되는
  **파생값**(성찰 있으면 7, 검증 있으면 4…). 위저드의 명시적 상태와
  이중화되면 모순 발생. ② `student-step-N` DOM 앵커를 9개 파일이 참조
  (App.test.tsx 포함) — 제거 시 기존 테스트 파손 가능.
- `free_draw` 모드는 7단계 개념이 없음 — 위저드는 활동 모드에만 적용.

---

## 2. 절대 규칙 (전 단계 공통, 위반 시 해당 커밋 폐기)

1. 기존 237개 테스트를 깨뜨리지 않는다. 테스트 수정이 불가피하면
   목록과 사유를 먼저 보고하고 **승인 후** 변경한다.
2. 완료 선언의 유일한 근거는 검증 명령의 실제 실행 로그다.
   "통과할 것으로 예상" 표현 금지.
3. 추측으로 코드를 작성하지 않는다. 불확실하면 해당 파일을 먼저 읽는다.
4. 비밀값(API 키, 서비스 계정, 실제 수업코드, 학생 데이터) 커밋 금지.
5. 스코프 확장 금지. 지시된 범위 밖 리팩터링 금지.
6. `--force` push, main 직접 커밋, `it.skip`·`--passWithNoTests`로
   게이트 우회 금지.
7. 검증 3종 세트 — 매 단계 완료 시 필수 실행·로그 첨부:
   ```powershell
   cd apps/workbench
   npm run typecheck
   npm test
   npm run build
   ```

---

## 3. 에이전트 체계: "1 쓰기 + N 읽기" (병렬 쓰기 금지)

쓰기 권한은 항상 1개 에이전트에게만 있다. 읽기는 병렬 허용
(충돌이 물리적으로 불가능하므로).

| 역할 | 권한 | 담당 |
|---|---|---|
| **Builder** (Codex) | 코드 쓰기 — **유일** | 현재 Phase의 구현 |
| **Reviewer** (Claude) | 읽기 전용 | diff를 본 지침서 대비 검수, 위반 지적 |
| **Verifier** | 읽기 + 명령 실행 | 검증 3종 실행, 로그 보고 (코드 수정 금지) |
| **Scribe** | WORK_STATE.md·CODEX_FEEDBACK.md 한정 쓰기 | 상태·보고 기록 (소스 접근 금지) |

**쓰기 락 규칙:**
- 동시에 존재하는 작업 브랜치는 1개. 이전 PR이 main에 병합되고 CI가
  녹색이 되기 전에는 다음 단계 파일을 1바이트도 수정하지 않는다.
- 브랜치명: `phase/{번호}-{작업명}`. 항상 최신 main에서 새로 딴다.
- 예외 병렬 후보였던 Phase 9(백엔드)도 **직렬로 확정** — 테스트 실패
  원인 판별 불가 문제 때문. 병행 시도 금지.

**세션 시작 의례 (Builder 필수):**
```
1. WORK_STATE.md 읽기 → 현재 단계 확인
2. git status / branch가 현재 단계와 일치하는지 확인
3. 불일치 또는 이전 단계 미병합 → 작업 거부, 상태 보고
4. 일치 → 본 문서의 해당 Phase 섹션을 다시 읽고 착수
```

---

## 4. 상태 추적: WORK_STATE.md (Phase 0에서 신설)

모든 단계의 시작·종료 시 Scribe가 갱신. 형식:

```markdown
# WORK_STATE.md
- 현재 단계: Phase N (작업명)
- 상태: 진행 중 | 승인 대기 | 완료
- 현재 기준선: typecheck ✅ / 테스트 NNN개 / build ✅ / CI 녹색
- 최근 병합: Phase N-1 — YYYY-MM-DD
- 차단 사항: (없으면 "없음")
```

기준선 승계: 각 단계 완료 시점의 테스트 수 = 다음 단계의 새 기준선.

---

## 5. 실행 순서 (변경 금지 — 의존성·충돌 분석의 결과)

```
Phase 0  준비 (WORK_STATE 신설)
Phase 1  LICENSE + README 공개품질    ─ 코드 0, 위험 0
Phase 2  GitHub Actions CI            ─ 이후 전 작업의 안전망 선설치
Phase 3  R1 디자인 토큰               ─ 스타일만
Phase 4  R2 위저드 전환 ★최대 위험    ─ App.tsx 파생 로직 교체
Phase 5  R3 불꽃 레일                 ─ R2의 currentStep에 의존
Phase 6  R4 검증 비교 카드
Phase 7  R5 리디자인 마감 QA
Phase 8  P5 Ketcher 로딩 개선         ─ R2가 3단계 레이아웃을 바꾸므로 R 이후
Phase 9  P4 입장코드 보안 강화        ─ 백엔드 전용, 격리 수행
Phase 10 P6 Playwright E2E            ─ 화면·API 확정 후가 아니면 전량 재작성
```

공통 종료 게이트: ① 해당 Phase 완료 판정 충족 ② 검증 3종 로그
③ CI 녹색(Phase 2 이후) ④ CODEX_FEEDBACK.md 보고 ⑤ WORK_STATE 갱신
⑥ 발주자 병합 승인.

---

## 6. 단계별 상세 사양

### Phase 0 — 준비
- WORK_STATE.md 생성, 기준선(237개) 기록.
- 잠금 구역 선언: `src/services/`, `firebase/`, `api/`는 Phase 9 전까지
  수정 금지.

### Phase 1 — LICENSE + README [코드 diff 0줄이어야 함, 커밋 2개 분리]
**LICENSE:** 루트에 MIT 원문, Copyright 2026 musicofcity-kr.
README에 라이선스 섹션 + "서드파티 라이브러리(Ketcher Apache-2.0,
RDKit BSD-3, 3Dmol.js BSD-3, Firebase Apache-2.0)는 각자의 라이선스를
따른다" 명시.
**README:** ① 상단 스크린샷 2~3장 — `docs/manual-assets/` 또는
`design/*/screen.png`에서 **현재 앱 화면과 일치하는 것만** 사용, 없으면
보류 보고 (옛 시안을 현재 화면처럼 게시 금지). `docs/readme-assets/`에
배치. ② 라이브 데모 링크는 발주자 제공 전까지 `<!-- TODO: 배포 URL -->`
placeholder — 가짜 URL 금지. ③ 기술 스택 표 (package.json 실측:
React 19 / Vite 6 / TS 5.8 / Ketcher 3.15 / RDKit.js / 3Dmol.js / Firebase 12).

### Phase 2 — CI
`.github/workflows/ci.yml`: push/PR to main, ubuntu-latest,
working-directory `apps/workbench`, Node 22 + npm cache →
`npm ci` → `typecheck` → `test` → `build`.
- `test:firestore-rules`(에뮬레이터)는 **포함하지 않는다**.
- 완료 판정: Actions 녹색 실행 URL 첨부, README에 CI 배지 추가.

### Phase 3 — R1 디자인 토큰 [수정: styles/global.css, index.html만]
`:root`에 아래 토큰 적용. 기존 `--phase-*` 변수명은 유지하고 값만 교체.

```css
--bg:#F6F8FB; --surface:#FFFFFF; --surface-dim:#EEF2F8;
--ink:#1B2430; --ink-soft:#5A6B7E; --line:#DCE4EE;
--phase-predict:#D9435F;  /* Li */  --phase-predict-soft:#FCEBEE;
--phase-build:#0F8F86;    /* Cu */  --phase-build-soft:#E6F4F3;
--phase-verify:#E8930C;   /* Na */  --phase-verify-soft:#FCF1DF;
--phase-reflect:#7C5CC4;  /* K  */  --phase-reflect-soft:#F0EBFA;
--ok:#1F8A5B; --retry:#B8860B; --error:#C6414C;
--radius-card:16px; --radius-chip:999px;
--shadow-card:0 2px 12px rgba(27,36,48,0.06);
```

- 타이포: 헤딩 Gmarket Sans(웹폰트, font-display:swap, 폴백 Pretendard),
  본문 Pretendard 17px/행간 1.65, 데이터 JetBrains Mono 18px — 기존 유지.
- 학생 화면 셀렉터의 구 회청색(#21313a, #34464d, #42636c) 치환.
  **교사 화면 셀렉터는 불변.** 학생 화면 12px 미만 텍스트 금지.
- 완료 판정: 토큰 diff + `grep -n "#21313a\|#34464d" styles/global.css`
  결과 첨부.

### Phase 4 — R2 위저드 전환 ★ [수정: components/student, app/]
**착수 전 승인 게이트 2개 (각각 승인 후 진행):**
1. App.tsx `currentLearningStep` 파생 로직을 명시적 `currentStep` 상태로
   교체하는 설계안 — 상태 소유 위치, free_draw 분기(위저드 미적용) 포함.
2. `student-step-N` 앵커 의존 9개 파일 영향 목록 + 수정 필요한 기존
   테스트 목록·사유.

**구현:**
- 현재 단계 컴포넌트 **하나만** 스테이지 카드로 렌더. slot props·데이터
  흐름·서비스 호출은 불변.
- 스테이지 카드: max-width 880px(3단계는 1280px + Ketcher min-height
  560px), 상단 4px 현재 phase 색 띠.
- 하단 고정 액션 바: `[← 이전]` / primary `[다음: {다음 단계 이름} →]`
  (배경 = 현재 phase 색). 3→4 이동은 `onConfirmStructure` 결과 필요.
  뒤로 이동 항상 허용 + 입력값 보존.
- 완료 판정: 신규 테스트 ≥6개(단계 렌더·가드·입력 보존), 전체 테스트
  통과, 1→7 수동 완주 + 4→2 역방향 입력 보존 스크린샷.

### Phase 5 — R3 불꽃 레일 [수정: LearningProgressRail]
- 스크롤 앵커 제거 → 상태 기반. 노드 = 원소기호(Li,Li,Cu,Na,Na,K,K) +
  라벨. 완료: phase 색 채움 + ✓. 현재: 이중 링 + 굵은 라벨. 미래:
  --line 외곽선. **색만으로 상태 구분 금지(3중 표기).**
- 점화 glow 1회 400ms, `prefers-reduced-motion` 시 생략.
- 키보드: 좌우 화살표 이동, Enter로 완료한 단계만 이동.
- 모바일(<768px): 축약형 — 현재 노드 + "검증 4/7" + 진행 바.
- 완료 판정: 3상태 렌더 + reduced-motion 분기 테스트.

### Phase 6 — R4 검증 비교 카드 [수정: ValidationResultCards]
- "내 예측 | 확인 결과" 2열, 데이터 값 JetBrains Mono 18px.
- 배지: 일치 `✓ 예측과 일치해요`(--ok) / 불일치
  `△ 예측과 달라요 — 어디가 다른지 살펴보세요`(--retry).
- **"오답"·"틀림" 어휘와 --error 색 사용 금지** (--error는 RDKit 파싱
  실패 등 시스템 오류 전용). 비교 로직은 기존 검증 데이터 사용,
  새 계산 금지.
- 완료 판정: 일치/불일치/시스템오류 3케이스 테스트.

### Phase 7 — R5 마감 QA
- 375/768/1440px 3뷰포트에서 1~7단계 수동 통과 스크린샷.
- `grep -E "font-size: 1[01]px|font-size: [0-9]px"` 결과 0건.
- focus ring(phase 색 2px)·터치 타깃 44px 확인.

### Phase 8 — P5 Ketcher 로딩 [수정: KetcherEditor 컴포넌트, vercel.json]
- dynamic import(`React.lazy`+`Suspense`) 확인/전환.
- 로딩 UI: "분자 편집기를 불러오는 중입니다 (최초 1회, 네트워크에 따라
  수십 초 소요될 수 있습니다)" + 스피너.
- vercel.json에 해시 파일명 자산 한정
  `Cache-Control: public, max-age=31536000, immutable`.
- **금지:** ketcher 교체·fork·수동 트리셰이킹 (별도 연구 과제).
- 완료 판정: 로딩 UI 테스트, dist 청크 전후 비교표.

### Phase 9 — P4 입장코드 보안 [잠금 해제: api/, firebase/ — 프론트 수정 금지]
**착수 전 승인 게이트:** 마이그레이션 계획 보고 (해시 교체 시 기존
수업방 joinCodeHash 호환 파손 대응).
- `buildJoinCodeHash`를 Node crypto SHA-256으로 교체, 입력 정규화 규칙
  유지, 비교는 `crypto.timingSafeEqual`.
- `joinCodeVersion` 도입: 없음/1 = 구 FNV 검증(기존 수업방 보호),
  2 = SHA-256. 신규 생성은 항상 2.
- Rate limit: `joinAttempts/{classroomId}` 카운터 — 10분 윈도우 실패
  30회 초과 시 차단 + 한국어 오류 메시지, 성공 시 리셋.
- 신규 테스트 ≥4 (구호환/신버전/차단/윈도우 해제).
- firestore.rules 변경 필요 여부 검토 후 보고서에 별도 명시.

### Phase 10 — P6 Playwright E2E
**정직한 한계 (README·보고서에 흐리지 말 것):** 서버 API는 네트워크
경계 mock — 보증 대상은 "UI 흐름 무결성"이며 서버 계약 실물 검증은
P7 후보(Firebase 에뮬레이터 + vercel dev, 착수 전 별도 승인).

- 설치: `@playwright/test`, `e2e/` 폴더, chromium 1개, webServer로
  vite dev 자동 기동, 스크립트 `test:e2e`. `npm test`(vitest)와 분리.
- 규칙: 셀렉터 `data-testid` 전용(문구 셀렉터 금지, 필요 testid는
  추가하되 로직 불변) · Ketcher 캔버스 드로잉 금지(예시 분자 불러오기
  경로 사용) · mock 응답은 실제 api/*.ts 응답 구조에서 복제 ·
  `waitForTimeout` 금지(상태 기반 대기, Ketcher는 timeout 90초 허용).
- 스모크: 앱 로드 → 윤리 게이트 → 역할 선택 렌더.
- 시나리오 ① 학생: 입장(join mock) → 활동 선택 → 예측 → 예시 분자
  로드 → 구조 확인(**RDKit은 mock 금지** — H₂O 분자식·분자량 실값
  assert) → 입체 → 비교 → 정리 → 제출(save mock) → 완료 확인.
  이동 가드(확인 전 "다음" 비활성) assert 포함.
- 시나리오 ② 교사: 입장 → 제출 목록(mock) → 피드백 작성 → AI 초안
  (mock)이 "교사 확인 후 전달" 순서를 강제하는지 assert → 반환.
- CI: 별도 job `e2e` (verify와 병렬), `playwright install --with-deps
  chromium`, 실패 시 trace artifact 업로드.
- 완료 판정: `--repeat-each=3` flaky 0건, 로컬·CI 양쪽 통과, 보고서에
  **mock 경계 목록** 명시, README 검증 명령에 test:e2e 추가.

---

## 7. 실패·롤백 프로토콜

1. 기준선 파손 시: 같은 브랜치 안에서만 2회 수정 시도. 미해결 시 중단·
   원인 보고. 다른 파일 영역으로 수정 확장 금지.
2. 병합 후 문제 발견 시: 다음 단계 착수 금지 → 해당 병합 revert →
   WORK_STATE 기록. "고치면서 다음 단계 병행"이 본 문서가 금지하는
   대표 상황이다.
3. flaky 테스트(3회 중 1회 무작위 실패)는 재시도 옵션으로 덮지 않는다.

## 8. ABORT 조건 (즉시 중단·보고, 임의 우회 금지)

- 기존 테스트 실패 원인이 내 변경일 때 (승인 없는 테스트 수정 금지)
- 지시 범위 밖 구조 변경·의존성 추가/제거가 필요해 보일 때
- 비밀값·학생 개인정보 노출 가능성 발견 시
- Phase 9에서 기존 데이터 호환성을 보장할 수 없다고 판단될 때
- 본 문서와 DESIGN 문서 또는 현재 코드가 모순될 때
- CI E2E job 10분 초과 시 (시나리오 축소 협의)

## 9. 보고 형식 (Scribe가 CODEX_FEEDBACK.md에 append)

```markdown
## [Phase N] 작업명 — YYYY-MM-DD
- 변경 파일:
- 검증: typecheck ✅/❌ | test N/N | build ✅/❌ | e2e(해당 시) ✅/❌
- 실행 로그 요약: (마지막 5줄)
- 신규 테스트: (파일·케이스 수)
- mock 경계 목록: (Phase 10만)
- 미해결/보류: (없으면 "없음")
- 다음 단계 착수 가능: 가능/불가 (사유)
```

## 10. 전체 완료 정의 (Definition of Done)

- Phase 0~10 전부 병합, main CI 녹색 (verify + e2e)
- 최종 테스트 수 ≥ 237 + 각 단계 신규 테스트 합 (감소 불허)
- WORK_STATE.md 상태 "전체 완료", CODEX_FEEDBACK.md에 전 Phase 보고 존재
- README: 라이선스·CI 배지·스크린샷·기술 스택·E2E 명령 반영
- 발주자(LEE WJ) 최종 승인
- 도달 목표: 종합 평가 85±2. 90+ 진입은 본 프로젝트 범위 밖의 후속
  (현장 투입 기록 `docs/FIELD_TEST_REPORT.md`, 실물 E2E P7, 긴급 로그인
  서버측 전환, Ketcher 번들 근본 개선)으로 별도 사이클 진행.
