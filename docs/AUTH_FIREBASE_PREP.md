# 학생/교사 진입 분리 및 Firebase 준비 기록

작성일: 2026-07-01  
상태: Firebase Auth 1단계 연결 완료, Firestore 수업방/제출 저장 MVP 연결

2026-07-02 업데이트: Firebase Auth 로그인 결과에서 teacher custom claim을
읽어 `authorized`, `pending_custom_claim`, `not_checked` 상태로 분리한다.
학생 수업코드 입장은 브라우저-local 또는 deferred fallback을 유지하되,
서버 환경변수가 준비된 배포 환경에서는 `/api/join-classroom` trusted endpoint가
Firebase ID token을 검증한 뒤 Firestore membership write를 담당한다.

2026-07-02 추가 업데이트: 교사 권한이 확인된 세션에서 Firestore 수업방
문서 생성, 공개 수업 정보 생성, published 활동 템플릿 생성, 수업방 제출 목록
조회가 가능하도록 클라이언트 서비스 계층을 연결했다. Firebase Anonymous UID와
Firestore 멤버십 문서가 모두 준비된 경우에만 서버 제출을 시도한다.

2026-07-02 추가 업데이트: Vercel Function 기반 `/api/create-classroom`과
`/api/join-classroom`을 추가했다. `/api/create-classroom`은 교사 Firebase ID
token의 `teacher` 또는 `role: "teacher"` custom claim을 Admin SDK로 검증한 뒤
수업방 문서를 만든다. `/api/join-classroom`은 학생 Firebase ID token을 Admin
SDK로 검증하고, 기존 수업방의 `joinEnabled`와 `joinCodeHash`를 확인한 뒤
`classrooms/{classCode}/students/{uid}` 멤버십 문서를 생성한다. Firebase Admin
서버 환경변수가 없거나 수업방이 없으면 학생은 기존 브라우저-local 활동 흐름으로
fallback한다.

2026-07-07 보안 업데이트: 신규 서버 수업방의 입장 확인코드 해시는
`server-join-code-v3` 형식의 SHA-256 값이며, 수업방별 랜덤 `joinCodeSalt`를
포함해 생성한다. 기존 `server-join-code-v2` 및 legacy client v1 교실은
호환 검증 전용으로 유지한다.

2026-07-27 개인정보 업데이트: 학생 닉네임·익명 식별자·답변·구조 snapshot을
origin-wide `localStorage` 제출함에 영속 저장하지 않는다. 제출 중 자료는 현재
학생 세션 메모리에만 두며, trusted endpoint 성공 응답이 있어야 제출 완료로
표시한다. 서버 실패 시 입력을 유지하고 재시도를 안내하며, 이전 버전의 제출
저장 키는 앱 시작 시 정리한다.

## 목적

`다양한 분자의 분자구조 모델링` 앱을 GitHub + Vercel + Firebase 기반 배포로 확장하기 전에 학생용 화면과 교사용 화면을 구조적으로 분리한다.

이번 단계의 목표는 실제 저장을 무조건 켜는 것이 아니라, Security Rules가
허용하는 범위에서 수업방과 제출 동기화의 최소 흐름을 준비하는 것이다.

- 학생은 회원가입 없이 수업코드, 입장 확인코드, 수업용 닉네임 또는 익명 ID로 입장한다.
- 교사는 Firebase Auth 기반 Google 로그인 또는 이메일 로그인을 사용할 수 있도록 UI와 권한 구조를 준비한다.
- Firestore 저장은 Security Rules가 허용하는 문서 shape와 권한에서만 시도한다.
- 이용자가 명시적으로 저장하는 비제출 활동 결과의 localStorage 기능은
  교사용/고급 보기에서만 별도로 유지한다.

## Firebase Auth 및 Firestore 연결 상태

2026-07-01 기준 다음 범위만 실제 SDK에 연결했다.

- `firebase/app`, `firebase/auth` Web SDK 초기화
- Vite 환경변수 기반 Firebase Web App config 감지
- config가 없을 때 앱이 깨지지 않고 로컬 임시 세션으로 동작
- 학생 입장 시 Firebase Anonymous Auth 시도
- 교사용 Google popup 로그인 연결
- 교사용 이메일/비밀번호 로그인 연결
- Firebase 장애 또는 수업 중 계정 문제에 대비한 로컬 긴급 교사용 로그인 추가
- 로그인 실패 시 학생/교사용 메시지와 개발자 로그 분리

추가로 연결한 범위:

- `firebase/firestore` Web SDK lazy 초기화
- Vercel Function `/api/create-classroom`에서 Firebase Admin ID token과 teacher claim 검증 후 `classrooms/{classCode}` 생성
- `/api/create-classroom`에서 `classrooms/{classCode}/public/info` 생성
- `/api/create-classroom`에서 선택한 활동 템플릿 id를 `classrooms/{classCode}/activityTemplates/{templateId}`에 published 문서로 생성
- Vercel Function `/api/join-classroom`에서 Firebase Admin ID token 검증 후 학생 멤버십 문서 생성
- 학생 제출 snapshot을 `classrooms/{classCode}/submissions/{submissionId}`에 저장 시도
- 교사용 수업코드 기반 제출 목록 조회
- 교사 피드백 초안/전달 상태를 Firestore 제출 문서에 update 시도
- Firestore 실패 시 현재 세션 입력 유지와 재시도 안내
- origin-wide 학생 제출 localStorage 제거와 legacy 키 정리

다음은 아직 구현하지 않았다.

- 입장 확인코드 자동 생성/회전 UI
- Firebase Admin SDK 기반 teacher custom claim 관리 UI

## 구현된 구조

### 경로

- `/`: 학생용 / 교사용 진입 선택 화면
- `/student`: 학생 입장 화면
- `/student/workbench`: 학생 수업 활동 화면
- `/teacher`: 교사용 로그인 준비 화면
- `/teacher/dashboard`: Firebase Auth 이후 연결할 교사용 대시보드 placeholder

현재는 별도 라우터 라이브러리 없이 브라우저 `history.pushState`와 경로 판별 helper로 처리한다.

### 추가된 핵심 파일

- `src/types/session.ts`
  - `UserRole`
  - `AppRoute`
  - `StudentSession`
    - `anonymousStudentId`
    - `startedAt`
  - `TeacherSession`
  - `TeacherAuthorizationStatus`
    - `authorized`
    - `pending_custom_claim`
    - `not_checked`
  - `ClassroomJoinStatus`
    - `local_session_only`
    - `deferred_until_trusted_endpoint`
    - `joined`
  - `UserSession`
  - 학생 입장 입력값 정규화/검증 함수
  - teacher custom claim 판정 helper

- `src/contexts/UserSessionContext.tsx`
  - 학생 입력 검증 뒤 Firebase Anonymous Auth와 trusted 수업방 입장 요청
  - Firebase Anonymous Auth 성공 시 `firebaseUid`, ID token과 멤버십 상태 보관
  - 교사용 Google/email 로그인 성공 시 교사 세션 생성
  - 교사 권한은 Firebase ID token claim을 읽어 `authorized`,
    `pending_custom_claim`, `not_checked`로 표시
  - 명시적 서버 거절은 입장을 차단하고, bodyless 404/405·5xx·네트워크 장애는
    `deferred_until_trusted_endpoint`로 구분
  - 화면 세션은 메모리에 두되, joined 세션의 멤버십·제출·피드백은 trusted
    endpoint를 통해 Firestore와 연결

- `src/services/firebase/classroomJoinService.ts`
  - trusted `/api/join-classroom` 호출
  - 명시적 JSON 거절과 인프라/라우팅 장애를 분리
  - 성공 응답의 published 활동 template id를 학생 세션에 전달

- `src/components/auth/RoleGate.tsx`
  - 역할 기반 UI 게이트

- `src/components/auth/StudentEntryScreen.tsx`
  - 수업코드 입력
  - 수업용 닉네임 또는 익명 ID 입력
  - 학생 활동 시작 버튼

- `src/components/auth/RoleSelectionScreen.tsx`
  - 루트 경로에서 학생 입장과 교사용 로그인 진입을 분리

- `src/components/auth/TeacherDashboardPlaceholder.tsx`
  - 인증 세션 이후 연결할 수업방 생성, 활동 관리, 제출 목록 자리 표시

- `src/components/auth/TeacherEntryScreen.tsx`
  - Google 교사용 로그인 버튼
  - 이메일/비밀번호 교사용 로그인 폼
  - `VITE_EMERGENCY_TEACHER_USERNAME`, `VITE_EMERGENCY_TEACHER_PASSWORD`가 설정된 배포본에서만 긴급 로그인 입력 폼 표시
  - 긴급 로그인 값은 공개 저장소에 커밋하지 않으며 실제 계정 비밀번호를 재사용하지 않음
  - 긴급 로그인은 교사용 화면 진입용 fallback이며 Firebase ID token을 발급하지 않음
  - 서버 제출 조회, 수업방 생성, 피드백 반환 같은 Firestore 기능 권한으로 사용하지 않음
  - 수업방 생성 UI 초안
  - 활동 관리 UI 초안
  - 제출 목록 placeholder

- `src/config/firebaseConfig.ts`
  - Vite 환경변수 기반 Firebase Web App config 읽기
  - config가 있을 때만 Firebase App/Auth lazy 초기화
  - config가 있을 때만 Firestore lazy 초기화

- `src/services/firebase/firebaseAuthService.ts`
  - 학생 Anonymous Auth
  - 교사 Google popup 로그인
  - 교사 email/password 로그인
  - 교사 로그인 뒤 ID token custom claims 확인
  - Auth failure의 학생/개발자 메시지 분리

- `src/services/firebase/classroomRepository.ts`
  - Firestore 저장소 계층
  - 교사용 수업방 생성
  - 학생 제출 snapshot 저장 시도
  - 교사용 제출 목록 조회
  - 교사 피드백 상태 update 시도
  - config/권한/멤버십이 맞지 않으면 학생용 메시지와 개발자 로그를 분리해 반환

- `.env.example`
  - Firebase Web App 환경변수 이름만 제공
  - 실제 API key, service account, private token은 포함하지 않음

## 보안 원칙

- 학생 실명/학번을 기본 입력으로 요구하지 않고 수업용 닉네임만 사용
- 학생 제출은 Firebase UID·멤버십·문서 소유권 검증 뒤에만 서버 저장
- 개인정보가 포함될 수 있는 제출 snapshot을 origin-wide localStorage에
  영속 저장하지 않음
- 공개 저장소에 service account, private token 저장 금지
- Firebase config는 `.env.local` 또는 Vercel Environment Variables로 관리
- Firestore write는 emulator 회귀를 통과한 Security Rules 및 trusted endpoint
  범위에서만 활성
- Firebase Auth 로그인만으로 교사용 비공개 해설과 학생 제출 목록을 공개하지 않음
- `teacher: true` 또는 `role: "teacher"` custom claim이 확인된 경우에만
  교사용 상세 패널을 활성화

## 현재 데이터 저장 상태

| 데이터 | 현재 처리 | 서버 저장 여부 |
|---|---|---|
| 수업코드 | 학생 세션 및 trusted endpoint 요청 | membership·submission 범위에서 저장 |
| 수업용 닉네임/익명 ID | 학생 세션 및 멤버십·제출 문서 | endpoint 설정 시 저장 |
| 명시적 활동 결과 저장 | 교사용/고급 보기의 기존 localStorage | 브라우저 저장 |
| 교사 로그인 | Firebase Auth Google/email 연결, custom claim 상태 확인 | Firebase Auth 및 앱 세션 |
| 수업코드 입장 | trusted joinClassroom endpoint 또는 local/deferred 표시 | endpoint 설정 시 membership 저장 |
| 수업방 생성 | teacher claim 확인 후 trusted createClassroom endpoint 호출 | endpoint 설정 시 저장 |
| 활동 결과 제출 | 현재 세션 메모리에서 trusted endpoint write | 멤버십·소유권 확인 시 저장 |
| 제출 목록 | 교사 UID·token·수업코드 범위의 서버 조회 | 권한 있을 때 조회 |

## 다음 단계

1. teacher custom claim 발급/회수 관리자 절차 수립
2. Vercel Firebase Admin 환경변수 연결
3. `/api/create-classroom`으로 테스트 수업방 문서 생성 QA
4. 학생 anonymous Auth UID와 수업 멤버십 문서 연결 QA
5. 입장 확인코드 최소 길이와 회전 절차를 운영 정책으로 고정
6. Firestore 학생 자료의 보유 기간·관리자 삭제 절차를 운영 정책으로 고정
7. 학생 제출 저장 기능을 beta 단계에서 제한적으로 운영 검증

## Firestore 보안 설계 결정

- 학생은 회원가입하지 않는 UX를 유지하되, Firestore 권한 판정에는 Firebase Anonymous Auth UID를 사용한다.
- 수업방 생성, 수업코드와 입장 확인코드 검증, 학생 멤버십 문서 생성은 Firestore client write가 아니라 trusted server endpoint에서 처리한다.
- 교사는 Firebase Auth 로그인 후 `teacher: true` 또는 `role: "teacher"` custom claim을 기준으로 접근한다.
- custom claims에는 권한 판단 정보만 넣고, 교사 프로필이나 수업 목록은 넣지 않는다.
- production Firestore write는 `firebase/firestore.rules`가 emulator 기반 rules
  test를 통과하고, Firebase Admin 환경변수와 운영 보유·삭제 절차가 준비된
  배포에서만 활성화한다.

## 검증 기준

이번 단계 완료 조건:

- `/student`에서 학생 입장 화면이 표시된다.
- 학생 입장 후 `/student/workbench`에서 기존 분자구조 모델링 활동 흐름이 표시된다.
- `/teacher`에서 교사용 Google/email 로그인 화면이 표시된다.
- `/teacher/dashboard`는 교사 세션이 있을 때 대시보드 placeholder를 표시한다.
- teacher custom claim이 없으면 교사용 상세 패널과 고급 로그를 표시하지 않는다.
- 인증 전 교사용 비공개 패널은 표시되지 않는다.
- 학생 A의 초안·제출 캐시·파생 상태는 학생 identity 전환 시 학생 B에게
  보이지 않는다.
- 학생 제출의 trusted 저장, 교사 제출 조회, 피드백 update는 현재 UID·token·
  수업코드·요청 범위를 벗어난 응답을 반영하지 않는다.
- 이전 `molecule-workbench-activity-submissions` localStorage 키는 읽지 않고
  정리한다.
- `npm run typecheck`, `npm test`, `npm run build`가 통과해야 한다.
