# WORK_STATE.md
- 현재 단계: Phase 11.2 (교사용 Google 로그인 진단)
- 상태: 코드 보완 완료 / Firebase 외부 설정 대기
- 현재 기준선: typecheck ✅ / 테스트 253개 ✅ / e2e 3개 ✅ / build ✅
- 최근 작업: Firebase 미설정 로그인 제어와 인증 오류별 안내 추가 — 2026-07-12
- 잠금 구역: 신규 API/Firebase production 동작 변경 금지. E2E는 mock 경계만 허용.
- 차단 사항: 실제 로그인 활성화에 필요한 Firebase Web App config가 저장소와 `.env.local`에 없음
