# REVIEWER_FEEDBACK.md

> 이 파일은 **감시자(Claude)가 Codex에게 남기는 피드백**입니다. Codex는 이 파일을 읽고 해당 항목을 수정해 주세요.
> (Codex 자신의 진행 보고는 `CODEX_FEEDBACK.md`, 상태는 `WORK_STATE.md` — 이 파일과 역할이 다릅니다.)
> 각 항목은 `[상태]`로 표시합니다: `OPEN`(미해결) / `FIXED`(Codex가 고침) / `WONTFIX`(보류·사유).
> 수정 후에는 상태를 `FIXED`로 바꾸고 한 줄 근거를 남겨 주세요. 감시자가 다음 순회에서 검증합니다.

최종 검토 기준선: 브랜치 `phase/0-10-final-refactor`, HEAD `d7476fd` (2026-07-06).
아래 3건은 모두 **잠금 구역**(`apps/workbench/api/`, `apps/workbench/src/services/`, `firebase/`)에 있어 **Phase 9에서** 처리 대상입니다.

---

## [FIXED ✅검증] R-1 (🔴 높음) — create-classroom 이 기존 교실을 덮어씀(takeover)
- 처리: `classroomRef.create()`로 신규 문서만 생성하도록 바꾸고, 중복 수업코드는 `409 classroom_exists`로 거절하는 회귀 테스트를 추가했다.
- 감시자 검증 ✅ (2026-07-06): `create-classroom.ts` L374 `classroomRef.create(...)` + L238/244 `409 classroom_exists` 확인. 덮어쓰기/탈취 차단됨.
- 위치: `apps/workbench/api/create-classroom.ts` → `createFirebaseAdminDependencies().writeClassroom` (`classroomRef.set(documents.classroom)`)
- 문제: 존재 확인 없이 `.set()`을 실행 → 같은 `classCode`의 기존 교실 문서를 **무조건 덮어씀**. `ownerTeacherUid`·`joinCodeHash`·`teacherUids`가 전부 교체됨.
- 영향: teacher claim을 가진 **아무 계정이나** 남의 `classCode`로 create 호출 시 그 교실을 **탈취/초기화**. 악의 없이 두 교사가 같은 코드를 써도 서로 덮어씀. Admin SDK는 Firestore 규칙을 우회하므로 규칙의 소유권 보호(`ownerTeacherUid` 불변)가 여기엔 적용되지 않음 → 엔드포인트가 직접 막아야 함. (`join-classroom.ts`는 교실 존재를 확인하는데 create는 비존재 확인이 없어 비대칭.)
- 권장 수정: `.set()` 대신 `.create()`(문서 있으면 실패) 또는 트랜잭션으로 `if (snapshot.exists) return 409`. 소유자 재생성 허용 정책이면 기존 `ownerTeacherUid === uid` 확인 후에만 덮어쓰기.

## [FIXED ✅검증] R-2 (⚠️ 중간) — joinCodeHash가 비암호학적 해시(FNV-1a)
- 처리: 서버 수업방은 Node `crypto` SHA-256 기반 해시와 `timingSafeEqual` 비교를 사용한다. 2026-07-07부터 신규 수업방은 수업방별 랜덤 `joinCodeSalt`가 포함된 `server-join-code-v3-*`로 생성하고, 기존 v2 SHA-256과 v1 FNV는 호환 검증 전용으로 유지한다.
- 감시자 검증 ✅ (2026-07-06): 신규 모듈 `api/join-code-security.ts`에서 `createHash('sha256')`(64 hex) + `timingSafeEqual`(상수시간, 타이밍공격 방어) 확인. 세 곳 중복 구현이 이 모듈로 통합됨(권장사항 반영). 핵심 약점(FNV-1a) 해소됨.

### [FIXED ✅검증] R-2b (🟡 낮음, 방어심층 후속) — join code 해시에 랜덤 salt 미포함
- 처리: 신규 수업방 생성 시 서버에서 16바이트 랜덤 `joinCodeSalt`를 만들고, `sha256(classCode:joinCode:joinCodeSalt)` 기반 `server-join-code-v3-*` 해시를 저장하도록 수정했다. `/api/join-classroom`은 v3 salt 검증을 우선 사용하며, 기존 v2/v1 교실은 호환 검증 전용으로 유지한다.
- 감시자 검증 ✅ (2026-07-07): salt 라운드트립 확인 — `generateJoinCodeSalt`=`randomBytes(16).hex`, create가 `joinCodeSalt`+`joinCodeVersion` 문서 저장(L335/347/350) → join이 다시 읽어(L462/463) v3 검증에 사용(L528/531). `sha256(classCode:joinCode:salt)` 정상, v3/v2/v1 버저닝 호환. 잔여위험(salt≠비밀) 인식도 정확.
- 남는 위험: salt는 비밀값이 아니므로 짧은 입장 확인코드의 오프라인 추측 위험을 완전히 없애지는 않는다. 운영 단계에서는 충분한 길이의 확인코드와 회전 절차를 유지해야 한다.

## [FIXED ✅검증] R-3 (⚠️ 중간) — join/create 엔드포인트 레이트리밋 부재
- 처리: 학생 입장 경로에 `joinAttempts/{classCode}` 10분 윈도우/30회 실패 제한을 추가하고 초과 시 `429 rate_limited`로 차단한다. 수업방 생성 경로는 teacher custom claim 및 R-1 중복 생성 차단으로 보호한다.
- 감시자 검증 ✅ (2026-07-06): `join-classroom.ts` L255/261 `429 rate_limited`, L472/481/484 `joinAttempts/{classCode}` 카운터(증가·성공시 삭제) 확인. 온라인 브루트포스 차단됨.
- 위치: `apps/workbench/api/join-classroom.ts`, `apps/workbench/api/create-classroom.ts` (그 외 신규 엔드포인트 포함).
- 문제: 시도 횟수 제한(429/throttle)이 없음. 익명 로그인 토큰은 쉽게 얻으므로 `classCode`+`joinCode` **무차별 대입(enumeration)** 가능. R-2의 약한 해시와 결합 시 실질 gate가 약함.
- 권장 수정: IP/uid별 레이트리밋(Firestore TTL 카운터 또는 Vercel/edge 레벨) + 초과 시 429. `joinCode` 최소 길이·엔트로피 정책 도입(짧은 코드 금지).

---

## 참고 (검토 대기, Phase 9)
- 신규 서버 엔드포인트 `create-feedback-draft.ts`, `save-submission.ts`, `list-submissions.ts`, `update-feedback.ts`, `list-student-feedback.ts`는 아직 미검토. Phase 9에서 동일 기준(토큰 서버검증·권한·입력 새니타이즈·비밀값 미노출·`.set` vs `.create`)으로 점검 예정.
- Gemini 전환된 교사 AI 피드백 경로: API 키가 클라이언트 번들/로그에 노출되지 않고 서버 프록시로만 호출되는지 Phase 9에서 확인 예정.
