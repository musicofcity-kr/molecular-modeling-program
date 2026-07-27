# QA Scorecard

- 평가일: 2026-07-27
- 기준: `CODEX 분자구조모델링 메타프롬프트.md`
- 대상: `apps/workbench`
- 기준 커밋: `905b622e74727a70b8f4804bab456d55cd682775` + 미커밋 working tree
- 이전 점수: **56/100**
- 최종 로컬 QA 점수: **95/100** (`+39`)
- Critical: **0건**
- High: **0건**
- 강제 상한: **모두 비활성**
- 판정: **로컬 release candidate 완료 / production 미배포**

## 1. 증거 수준

| 수준 | 적용 기준 |
|---|---|
| E3 | 2026-07-27 실제 실행, 자동화 테스트, 현재 화면 PNG 또는 에뮬레이터 결과 |
| E2 | 현재 코드와 단위·컴포넌트 테스트 |
| E1 | 문서 또는 정적 코드 추정 |
| E0 | 현재 검증 없음 |

Mock E2E를 실제 Firebase·Vercel production 검증으로 확대 해석하지 않았다.
로컬 완료와 운영 배포 승인은 별도다.

## 2. 최종 점수표

| 영역 | 배점 | 점수 | 증거 수준 | 근거 | 남은 문제 |
|---|---:|---:|---|---|---|
| A. 핵심 기능 안정성 | 18 | 18 | E2/E3 | 입장, 예시, Ketcher, RDKit, 3D/VSEPR, 제출·피드백을 단위 및 Playwright로 검증 | 실제 production 인증·수업방은 배포 후 확인 |
| B. 화학 교수학습 타당성 | 18 | 18 | E2/E3 | VSEPR 근거 사슬, 배열/구조 구분, 두 3D 출처 구분, 13종 기준 분자와 적대 구조 차단 | 교육 모형 범위 밖은 의도적으로 인간 검토 |
| C. 직관성·정보 구조 | 14 | 14 | E3 | 자유 이동 5단계, 실제 상태 표시, 명시적 분석 후 이동, 간편 용어와 결과 위계 | 없음 |
| D. UI 시각 완성도 | 10 | 9 | E3 | 5개 viewport full-page와 touch 완료 화면 육안 확인, 일관된 카드·버튼·3D 중심 구성 | 긴 데스크톱 고급 화면은 정보 밀도가 높음 |
| E. 모바일·반응형 | 12 | 11 | E3/E2 | 390×844 touch 완료, Ketcher 터치, 3D drag, safe-area 하단 탭, 844×390과 overflow 0 검증 | 실제 OS 소프트 키보드는 headless로 재현하지 못함 |
| F. 접근성 | 8 | 7 | E2/E3 | 키보드 포커스 순서, label/name, 오류 연결, 색상 외 상태 텍스트, 44px·reduced-motion 계약 | 물리 스크린리더와 200% 확대 수동 검증 필요 |
| G. 오류 처리·회복성 | 7 | 7 | E3 | 자격 오류/인프라 장애 분리, 빈·미지원 구조, 3D 없음, 제출 실패·중복 방지·세션 재시도 검증 | 없음 |
| H. 성능·코드 품질 | 5 | 4 | E2/E3 | 타입 안정성, request scope, cleanup, 지연 응답 무효화, 2,131 module build 성공 | 3Dmol `eval`과 Ketcher 대형 chunk 경고 |
| I. 보안·개인정보 | 4 | 3 | E2/E3 | teacher claim·membership·소유권, rate limit, 비밀 패턴 scan, 세션 격리, AI 요청·응답 deep redaction 검증 | 의존성 advisory와 비정형 이름/문맥 PII 한계 |
| J. 테스트·문서·재현성 | 4 | 4 | E3 | typecheck·392 unit·build·34 E2E·17 rules, CI 3회 반복 설정, 보고서·스크린샷·운영 문서 | 없음 |
| **합계** | **100** | **95** |  |  | **미검증/감점 5점, 완료 기준 충족** |

## 3. 강제 상한 판정

| 상한 | 상태 | 근거 |
|---|---|---|
| CAP-F | 비활성 | 앱·빌드·입장 흐름 동작, 비밀키/서비스 계정 패턴 미검출, 인증 우회·무단 제출 노출 High 0 |
| CAP-D | 비활성 | Ketcher·RDKit·교사 회귀·제출 영수증·기준 화학 결과 통과 |
| CAP-C | 비활성 | 390×844 touch 완료, 3D 조작, 오류 복구, 키보드 진입 순서 통과 |
| CAP-B | 비활성 | 자동화 E2E 34개, 핵심 학생 흐름 E3, 실제 Ketcher 마우스·터치 직접 그리기, 390px overflow 0, 두 3D 모형 성격 분리 |
| CAP-A | 비활성 | 95점, Critical/High 0, 필수 명령 전부 성공, 재현 가능한 증거 패키지 작성 |

## 4. Critical/High 종결표

| ID | 종전 심각도 | 종결 내용 | 재검증 |
|---|---|---|---|
| UX-H01 | High | 잠금 없는 5단계 진행·상태 UI와 모바일 5탭 구현 | 컴포넌트 + 5 viewport E2E |
| UX-H02 | High | Ketcher 간편/고급 모드, exact KET 보존, 실패 시 원래 모드 복구 | 단위 + Chromium 구조 보존 |
| UX-H03 | High | Pixel 5 touch 전체 흐름, safe-area, 고정 탭 overlap 방지 | mobile-chromium 완료 |
| UX-H04 | High | 명시적 4xx 거절과 HTML 404/네트워크 인프라 장애 분리 | 오류 E2E |
| DATA-H01 | High | 학생 draft·완료 영수증을 class+UID scope로 격리, 역할/identity 전환 시 초기화 | 학생·교사 세션 격리 E2E |
| DATA-H02 | High | 학생 서버 제출의 origin-wide `localStorage` 저장 제거, legacy key purge-only | 실패 재시도·비영속 E2E |
| CHEM-H01 | High | 표준 4번째 strict V2000 counts line만 허용하여 제목/주석 우회 차단 | adversarial V2000 단위 테스트 |
| CHEM-H02 | High | PubChem formula-only/isomeric-only 우회 차단, SDF를 공용 RDKit gate로 재검증 | PubChem 서비스 테스트 |
| SEC-H01 | High | join/create 소유권·버전 salt·class+UID rate limit과 trusted scope 강화 | API·rules 테스트 |
| AI-H01 | High | 서버 전용 endpoint, provider payload key/value/숫자 deep redaction, 응답 redaction | 공격 테스트 13개 |
| AI-H02 | High | non-OK·malformed JSON 원문/parser message 제거, 고정 오류 문구 사용 | malformed provider 회귀 + 독립 재감사 |

독립 화학·세션·PubChem·AI 개인정보 재감사에서 추가 Critical/High가 없음을
확인했다.

## 5. 명령 결과

| 명령 | 결과 | 증거 |
|---|---|---|
| `npm ci` | 성공 | 559 packages 설치, 560 packages 검사; manifest 변경 없음 |
| `npm run typecheck` | 성공 | TypeScript project build |
| `npm test` | 성공 | **54 files / 392 tests** |
| `npm run build` | 성공 | **2,131 modules**, 36.69초 |
| `npm run test:e2e` | 성공 | **34 passed**, Chromium + mobile-chromium, 4.1분 |
| `npm run test:firestore-rules` | 성공 | **17 passed**, Firebase emulator + Java 21 |
| `git diff --check` | 성공 | whitespace 오류 없음 |

상세 환경·경고·시나리오·화면 파일은 `docs/QA_TEST_REPORT.md`에 기록한다.

## 6. 필수 시나리오 판정

| 시나리오 | 결과 | 증거 |
|---|---|---|
| A. 정상 입장·활동 | 통과 | 역할 선택, 학생 입장 mock, H2O 제출 |
| B. H2O 기본 탐구 | 통과 | O 중심, 결합 영역 2, 비공유 전자쌍 2, 정사면체형/굽은형, 두 3D |
| C. CH4·NH3·H2O 비교 | 통과 | 전체 영역 4, 비공유 전자쌍 0/1/2 |
| D. 오류 처리 | 통과 | 빈 구조, 미지원 구조, 잘못된 코드, network/HTML 404, 3D 없음, 제출 조건/실패 |
| E. 모바일 390×844 | 통과 | touch 5단계 완료, 3D drag, 기록·제출, fixed-nav overlap/overflow 없음 |
| 교사 회귀 | 통과 | 제출 조회, AI 초안, 교사 검토·반환, 실패 재시도, 세션 격리 |

## 7. 남은 Medium/Low

| ID | 심각도 | 영향 | 우회·다음 조치 |
|---|---|---|---|
| PERF-M01 | Medium | Ketcher 약 23.9MB minified, 3Dmol `eval` 경고 | 현재 lazy chunk 유지; 수업망 성능 예산과 upstream 대안을 별도 검토 |
| SEC-M01 | Medium | `npm ci`가 9 moderate·3 high advisory를 보고했으나 제품 도달성 미분류 | 강제 업데이트 금지; lockfile 기반 reachability 검토 후 안전한 버전만 회귀 |
| PRIV-M01 | Medium | 정규식은 자유형 이름·문맥 PII를 완전 탐지하지 못함 | 학생 입력 자제, 교사 원문·AI 응답 확인, 학교 담당자 synthetic payload 감사 |
| DATA-M01 | Medium | Firestore 자동 TTL·학생 self-service 삭제가 없음 | 운영 보유기간 확정 후 관리자 삭제 절차·TTL 설계 |
| AUTH-M01 | Medium | UID 회전은 per-UID join 제한을 우회할 수 있음 | 코드 길이·회전 유지, production edge/IP 보조 제한 검토 |
| A11Y-L01 | Low | 실제 OS 키보드·스크린리더·200% 확대 미검증 | 배포 승인 전 물리 기기 체크리스트 수행 |
| E2E-L01 | Low | Ketcher 강제 `onInit` 실패 주입 E2E 없음 | 복구 순수함수·UI 계약은 검증됨; 향후 component harness 추가 |

## 8. 완료 경계

메타프롬프트의 로컬 완료 게이트는 충족했다. 다만 실제 Firebase/Vercel 환경,
학교 개인정보·보유 정책, 물리 접근성 기기 검증은 수행하지 않았으므로
production 완료를 선언하지 않는다. 커밋·푸시·배포도 수행하지 않았다.
