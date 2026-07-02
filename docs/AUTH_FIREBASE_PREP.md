# 학생/교사 진입 분리 및 Firebase 준비 기록

작성일: 2026-07-01  
상태: Firebase Auth 1단계 연결 완료, Firestore 수업방/제출 저장 MVP 연결

2026-07-02 업데이트: Firebase Auth 로그인 결과에서 teacher custom claim을
읽어 `authorized`, `pending_custom_claim`, `not_checked` 상태로 분리한다.
학생 수업코드 입장은 `joinClassroom` trusted endpoint 연결 전까지
브라우저-local 또는 deferred 상태로 표시하며, Firestore membership write는
계속 비활성 상태로 둔다.

2026-07-02 추가 업데이트: 교사 권한이 확인된 세션에서 Firestore 수업방
문서 생성, 공개 수업 정보 생성, published 활동 템플릿 생성, 수업방 제출 목록
조회가 가능하도록 클라이언트 서비스 계층을 연결했다. 학생 제출은 기존
localStorage 제출함에 먼저 저장하고, Firebase Anonymous UID와 Firestore
멤버십 문서가 모두 준비된 경우에만 서버 제출함에도 저장을 시도한다. 멤버십이
없거나 Firestore 권한이 맞지 않으면 학생 결과는 브라우저 제출함에 남고 서버
동기화 실패 메시지만 표시한다. 배포 환경에서 Firestore 응답이 지연되는 경우도
무기한 대기하지 않고 제한 시간 뒤 브라우저 제출함 보관 메시지로 수렴시킨다.

## 목적

`다양한 분자의 분자구조 모델링` 앱을 GitHub + Vercel + Firebase 기반 배포로 확장하기 전에 학생용 화면과 교사용 화면을 구조적으로 분리한다.

이번 단계의 목표는 실제 저장을 무조건 켜는 것이 아니라, Security Rules가
허용하는 범위에서 수업방과 제출 동기화의 최소 흐름을 준비하는 것이다.

- 학생은 회원가입 없이 수업코드와 수업용 닉네임 또는 익명 ID로 입장한다.
- 교사는 Firebase Auth 기반 Google 로그인 또는 이메일 로그인을 사용할 수 있도록 UI와 권한 구조를 준비한다.
- Firestore 저장은 Security Rules가 허용하는 문서 shape와 권한에서만 시도한다.
- 기존 localStorage 기반 임시 저장은 유지한다.

## Firebase Auth 및 Firestore 연결 상태

2026-07-01 기준 다음 범위만 실제 SDK에 연결했다.

- `firebase/app`, `firebase/auth` Web SDK 초기화
- Vite 환경변수 기반 Firebase Web App config 감지
- config가 없을 때 앱이 깨지지 않고 로컬 임시 세션으로 동작
- 학생 입장 시 Firebase Anonymous Auth 시도
- 교사용 Google popup 로그인 연결
- 교사용 이메일/비밀번호 로그인 연결
- 로그인 실패 시 학생/교사용 메시지와 개발자 로그 분리

추가로 연결한 범위:

- `firebase/firestore` Web SDK lazy 초기화
- 교사 권한 확인 세션에서 `classrooms/{classCode}` 생성
- `classrooms/{classCode}/public/info` 생성
- 선택한 활동 템플릿을 `classrooms/{classCode}/activityTemplates/{templateId}`에 published 문서로 생성
- 학생 제출 snapshot을 `classrooms/{classCode}/submissions/{submissionId}`에 저장 시도
- 교사용 수업코드 기반 제출 목록 조회
- 교사 피드백 초안/전달 상태를 Firestore 제출 문서에 update 시도
- Firestore 실패 또는 응답 지연 시 기존 브라우저 제출함/localStorage 흐름 유지

다음은 아직 구현하지 않았다.

- teacher custom claim 검증
- trusted `joinClassroom` endpoint
- 학생 멤버십 문서 생성
- trusted `joinClassroom` endpoint
- 수업코드 검증 후 학생 멤버십 문서 자동 생성
- production용 수업코드 secret/hash 발급
- Firebase Admin SDK 기반 teacher custom claim 관리 UI
- 교사용 제출 목록의 서버 동기화

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
  - 학생 임시 세션 생성
  - Firebase Anonymous Auth 성공 시 선택적으로 `firebaseUid` 보관
  - 교사용 Google/email 로그인 성공 시 교사 세션 생성
  - 교사 권한은 Firebase ID token claim을 읽어 `authorized`,
    `pending_custom_claim`, `not_checked`로 표시
  - 학생 수업코드 입장은 trusted endpoint 구현 전까지
    `classroomJoinStatus`로 deferred/local 상태를 기록
  - 서버 저장 없이 메모리 상태만 관리

- `src/services/firebase/classroomJoinService.ts`
  - 향후 trusted `joinClassroom` endpoint 연결 지점
  - 현재는 서버 호출과 Firestore membership write를 하지 않고 deferred/local
    상태만 반환

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

- 학생 실명/학번 저장 금지
- 학생 제출 데이터 서버 저장 금지
- 공개 저장소에 service account, private token 저장 금지
- Firebase config는 `.env.local` 또는 Vercel Environment Variables로 관리
- Firestore Security Rules 설계 전까지 Firestore write 비활성
- Firebase Auth 로그인만으로 교사용 비공개 해설과 학생 제출 목록을 공개하지 않음
- `teacher: true` 또는 `role: "teacher"` custom claim이 확인된 경우에만
  교사용 상세 패널을 활성화

## 현재 데이터 저장 상태

| 데이터 | 현재 처리 | 서버 저장 여부 |
|---|---|---|
| 수업코드 | 학생 세션 메모리 상태 | 저장 안 함 |
| 수업용 닉네임/익명 ID | 학생 세션 메모리 상태 | 저장 안 함 |
| 활동 결과 임시 저장 | 기존 localStorage | 브라우저 저장 |
| 교사 로그인 | Firebase Auth Google/email 연결, custom claim 상태 확인 | 세션만 메모리 저장 |
| 수업코드 입장 | trusted joinClassroom endpoint 전까지 local/deferred 표시 | membership 저장 안 함 |
| 수업방 생성 | teacher claim 확인 후 Firestore write 시도 | 권한 있을 때 저장 |
| 활동 결과 제출 | localStorage 우선 저장 후 Firestore write 시도 | 멤버십 있을 때 저장 |
| 제출 목록 | 수업코드 기준 Firestore 조회 + localStorage 제출함 유지 | 권한 있을 때 조회 |

## 다음 단계

1. teacher custom claim 발급/회수 관리자 절차 수립
2. trusted `joinClassroom` endpoint 설계/구현
3. 학생 anonymous Auth UID와 수업 멤버십 문서 연결
4. trusted `joinClassroom` endpoint 구현
5. 학생 제출 저장 기능을 beta 단계에서 제한적으로 운영 검증

## Firestore 보안 설계 결정

- 학생은 회원가입하지 않는 UX를 유지하되, Firestore 권한 판정에는 Firebase Anonymous Auth UID를 사용한다.
- 수업코드 검증과 학생 멤버십 문서 생성은 Firestore client write가 아니라 trusted server endpoint에서 처리한다.
- 교사는 Firebase Auth 로그인 후 `teacher: true` 또는 `role: "teacher"` custom claim을 기준으로 접근한다.
- custom claims에는 권한 판단 정보만 넣고, 교사 프로필이나 수업 목록은 넣지 않는다.
- production Firestore write는 `firebase/firestore.rules` 초안이 emulator 기반 rules test를 통과한 뒤 활성화한다.

## 검증 기준

이번 단계 완료 조건:

- `/student`에서 학생 입장 화면이 표시된다.
- 학생 입장 후 `/student/workbench`에서 기존 분자구조 모델링 활동 흐름이 표시된다.
- `/teacher`에서 교사용 Google/email 로그인 화면이 표시된다.
- `/teacher/dashboard`는 교사 세션이 있을 때 대시보드 placeholder를 표시한다.
- teacher custom claim이 없으면 교사용 상세 패널과 고급 로그를 표시하지 않는다.
- 인증 전 교사용 비공개 패널은 표시되지 않는다.
- Firestore 저장 함수는 아직 활성화되지 않는다.
- `npm run typecheck`, `npm test`, `npm run build`가 통과해야 한다.
