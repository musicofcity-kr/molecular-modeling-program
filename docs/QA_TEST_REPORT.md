# QA Test Report

- 실행일: 2026-07-27
- 작업 폴더: `C:\all\molecule-modeling-skill-package`
- 앱 폴더: `apps/workbench`
- 브랜치: `main`
- 기준 HEAD: `905b622e74727a70b8f4804bab456d55cd682775`
- 상태: 미커밋 working tree, production 미배포
- 런타임: Node.js `v24.15.0`, npm `11.12.1`, Windows PowerShell
- Firestore emulator: `firebase-tools 15.22.4`, Java `21.0.11`

## 1. 실행 결과

| 순서 | 명령 | 결과 | 세부 증거 |
|---:|---|---|---|
| 1 | `npm ci` | PASS | 559 packages 설치, 560 packages 검사. 9 moderate·3 high advisory 보고 |
| 2 | `npm run typecheck` | PASS | `tsc -b`, 오류 0 |
| 3 | `npm test` | PASS | 54 test files, 392 tests, 6.75초 |
| 4 | `npm run build` | PASS | Vite 6.4.3, 2,131 modules, 36.69초 |
| 5 | `npm run test:e2e` | PASS | Chromium/mobile-chromium 34 tests, 4.1분 |
| 6 | `npm run test:firestore-rules` | PASS | 17 tests, Firebase emulator script exit 0 |
| 7 | `git diff --check` | PASS | whitespace 오류 0 |

샌드박스 안의 Vite/Playwright 첫 실행은 하위 프로세스 `spawn EPERM`으로
차단되어 승인된 동일 명령을 샌드박스 밖에서 재실행했다. Firestore 도구도
샌드박스 cache-only 제한으로 첫 실행이 실패해 고정 버전 도구를 승인된
에뮬레이터 실행으로 재검증했다. 이는 제품 테스트 실패가 아니다.
Playwright 최종 기록은 일반 개발 서버를 재사용하지 않고 테스트가 직접 띄운
`--mode e2e` 서버에서 실행했다.

`npm run lint` 스크립트는 현재 `package.json`에 없으므로 별도 lint 결과는
없다. typecheck, Vitest, Playwright와 `git diff --check`를 현재 자동 품질
게이트로 사용한다.

## 2. 빌드 관찰

- 성공 산출물: `apps/workbench/dist/`
- Ketcher chunk: 약 23,900.87kB minified / 6,966.09kB gzip
- 3Dmol chunk: 약 588.28kB / 169.82kB gzip
- 알려진 경고:
  - 3Dmol 배포 파일의 `eval`
  - 500kB를 넘는 Ketcher·3Dmol·앱 chunk
- 판정: 기능 차단은 아니지만 수업망 초기 로딩 성능과 upstream 보안 검토가
  필요한 Medium 잔여다.

## 3. 단위·서비스 검증 범위

### 화학 안전

- Ketcher MOL/SMILES canonical 구조 일치
- strict V2000 4번째 counts line
- 제목·주석에 삽입된 가짜 `V2000` 우회 차단
- `M SUB`, `M UNS`, `M RBC`, 전하, 동위원소, 라디칼, disconnected/query
  구조의 fail-closed 처리
- PubChem canonical/isomeric candidate 일치와 SDF 공용 RDKit 재검증
- BeCl2 및 메타프롬프트 기준 13종 VSEPR 회귀
- RDKit JSON 원자·결합 그래프의 A/B/C 연결 근거와 분리 C4 fail-closed
- 전하 분리형 중성 구조 허용 경고, 순전하·동위원소·라디칼 차단
- 중심 원자 식별자와 국소 VSEPR 범위, 이상각·생성 좌표각 출처 분리
- RDKit 객체 해제와 중복 초기화 방지

### 세션·저장

- 학생 draft·완료 receipt를 `classCode + Firebase UID/anonymous ID`로 scope
- 학생/교사 role·identity 변경 시 구조, 파생값, draft, 목록, 지연 응답 무효화
- 학생 서버 제출의 `localStorage` fallback 제거
- legacy `molecule-workbench-activity-submissions` key는 hydrate하지 않고 purge
- 제출 실패 시 현재 탭 메모리에서만 재시도
- content key v3로 JSON 필드 순서·서버 metadata 차이를 무시하고 RDKit
  경고·구조 의도·A/B/C 연결 근거·국소 VSEPR 각도 출처 변경을 구분

### 인증·권한

- teacher custom claim, UID, classCode, request scope 검증
- submission 소유권·feedback update 잠금
- join code 버전 salt와 class+UID rate limit
- Firestore Rules에서 비인증 접근, 교사·학생 소유권 변경, 직접 membership
  생성 차단

### AI 피드백 개인정보

- production endpoint 선택은 `AI_FEEDBACK_ENDPOINT`만 허용
- provider 전송용 복제본의 객체 키·값·전화번호형 숫자를 깊게 정리
- 이메일, 한국 유선·휴대·070/080, `+82`·`0082`·`(0)` 변형,
  주민·외국인등록번호형, `학번`·`학생번호`를 `[개인정보 삭제]`로 치환
- provider 응답 필드에도 동일한 redactor 적용
- non-OK·malformed JSON 응답 원문과 parser message를 클라이언트에 반환하지 않음
- 원본 Firestore submission 불변
- `H2O`, `H-O-H`, `104.5도`, 일반 원자 수 보존
- `reviewRequired: true`, 자동 채점 금지, 교사 최종 검토 유지

AI 개인정보 집중 공격 테스트는 13/13 통과했고, 별도 재감사에서
Critical/High 0을 확인했다.

## 4. Playwright 시나리오

| 묶음 | 검증 내용 |
|---|---|
| 직접 그리기 | 실제 Ketcher 마우스 C→C4→분지→undo/redo→clear, 분리 C4 차단, 390px 터치 C4 |
| 입장·복구 | unauthorized 200, 명시적 4xx, HTML 404, network 실패 의미 분리 |
| 학생 정상 | H2O 불러오기·분석·생각·교사 제출 |
| 구조 무효화 | Ketcher 다음 편집·route 이탈 시 stale chemistry/3D 제거 |
| 제출 안전 | 조건 미충족, pending 잠금, 중복 방지, 서버 실패의 비영속 재시도 |
| 세션 격리 | 학생 A→교사→학생 B, 교사 logout/relogin, stale async 응답 무시 |
| VSEPR | H2O 근거표, CH4/NH3/H2O 전자영역 4·비공유 전자쌍 0/1/2 |
| Ketcher | 간편/고급 remount에서 exact water KET 보존, 다음 편집 감지 |
| 오류 교육성 | 빈 구조, 중심 원자 불명확 벤젠, 외부 3D 없음 |
| viewport | 1440×900, 1280×800, 768×1024, 390×844, 844×390 overflow |
| mobile touch | Pixel 5 context의 하단 5탭, Ketcher touch, 3D drag, 기록·제출 |
| 교사 | 제출 조회, AI 초안, 수정·반환, 실패 시 초안 보존 |

CI의 Playwright job은 `--repeat-each=3`으로 설정했다. 이번 로컬 최종 기록은
전체 34개 시나리오 1회 실행이며 flaky 0이다.

## 5. 화면 증거

| 파일 | CSS viewport / PNG 크기 | 확인 |
|---|---|---|
| `desktop-1440x900.png` | 1440×900 / 1440×5400 | 5단계 전체, 두 3D, 기록 영역 |
| `notebook-1280x800.png` | 1280×800 / 1280×5428 | 가로 overflow 없음 |
| `tablet-768x1024.png` | 768×1024 / 768×2422 | 하단 탭, VSEPR 모형, 비교 질문 |
| `mobile-390x844.png` | 390×844 / 390×2987 | 한 단계 중심 모바일 레이아웃 |
| `landscape-844x390.png` | 844×390 / 844×7027 | 가로 모드 핵심 조작 접근 |
| `mobile-390x844-touch-completed.png` | 390×844 CSS / 1073×4320 device pixels | 5단계 완료, 제출 receipt, fixed-nav overlap 없음 |

위 파일은 `docs/qa-screenshots/final/`에 있으며 최종 E2E가 다시 생성했다.
desktop, tablet, mobile touch 이미지를 육안 확인했고 비밀키·서비스 계정
문자열은 보이지 않았다.

## 6. 보안·개인정보 점검

- 추적 파일에서 private-key header, `sk-proj-`, Google API-key 형태를
  파일명 기준으로 검색했고 일치 파일이 없었다.
- `apps/workbench/.env.local`은 `.gitignore` 규칙에 의해 제외됨을 확인했다.
  값은 보고서나 출력에 복사하지 않았다.
- 학생 서버 제출은 브라우저 영속 fallback을 사용하지 않는다.
- AI provider 원문 오류 body는 응답·로그에 남기지 않는다.
- `npm ci` advisory 12건의 제품 도달 가능성은 이번 범위에서 확정하지 않았다.
  무리한 강제 업데이트는 수행하지 않았다.

## 7. 미검증·운영 전 필수 확인

1. 실제 Vercel/Firebase 프로젝트의 환경 변수, teacher claim, trusted endpoint,
   Firestore index·rules 배포 상태
2. 학교 개인정보 담당자의 실제 AI provider 계약·처리 위치·보유/삭제 정책
3. 이름·문맥형 PII가 포함된 synthetic adversarial payload의 실제 provider
   요청·응답·운영 로그 확인
4. 물리 Android/iOS 기기의 소프트 키보드, 스크린리더, 200% 확대
5. 수업망에서 Ketcher 대형 chunk의 초기 로딩 시간
6. Firestore 자동 TTL 또는 관리자 삭제 일정

이 항목은 현재 Medium/Low 잔여이며 로컬 핵심 흐름을 차단하지 않는다.
production 배포 승인 전에는 반드시 별도 확인한다.

## 8. 변경·배포 경계

- 새 production dependency: 없음
- 커밋: 수행하지 않음
- push/PR: 수행하지 않음
- Firebase/Vercel 배포: 수행하지 않음
- 실제 학생 데이터 생성: 수행하지 않음
- 사용자 제공 메타프롬프트와 `.agents.zip`: 수정하지 않음
