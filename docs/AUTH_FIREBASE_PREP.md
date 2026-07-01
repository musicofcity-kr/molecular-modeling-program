# 학생/교사 진입 분리 및 Firebase 준비 기록

작성일: 2026-07-01  
상태: Firebase Auth 1단계 연결 완료, Firestore 저장은 계속 비활성

## 목적

`다양한 분자의 분자구조 모델링` 앱을 GitHub + Vercel + Firebase 기반 배포로 확장하기 전에 학생용 화면과 교사용 화면을 구조적으로 분리한다.

이번 단계의 목표는 실제 서버 저장이 아니라 다음을 준비하는 것이다.

- 학생은 회원가입 없이 수업코드와 수업용 닉네임 또는 익명 ID로 입장한다.
- 교사는 Firebase Auth 기반 Google 로그인 또는 이메일 로그인을 사용할 수 있도록 UI와 권한 구조를 준비한다.
- Firestore 저장은 Auth와 Security Rules 설계 전까지 비활성 상태로 둔다.
- 기존 localStorage 기반 임시 저장은 유지한다.

## Firebase Auth 1단계 연결 상태

2026-07-01 기준 다음 범위만 실제 SDK에 연결했다.

- `firebase/app`, `firebase/auth` Web SDK 초기화
- Vite 환경변수 기반 Firebase Web App config 감지
- config가 없을 때 앱이 깨지지 않고 로컬 임시 세션으로 동작
- 학생 입장 시 Firebase Anonymous Auth 시도
- 교사용 Google popup 로그인 연결
- 교사용 이메일/비밀번호 로그인 연결
- 로그인 실패 시 학생/교사용 메시지와 개발자 로그 분리

다음은 아직 구현하지 않았다.

- teacher custom claim 검증
- trusted `joinClassroom` endpoint
- 학생 멤버십 문서 생성
- Firestore 제출 저장
- Firestore classroom write
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
  - `UserSession`
  - 학생 입장 입력값 정규화/검증 함수

- `src/contexts/UserSessionContext.tsx`
  - 학생 임시 세션 생성
  - Firebase Anonymous Auth 성공 시 선택적으로 `firebaseUid` 보관
  - 교사용 Google/email 로그인 성공 시 교사 세션 생성
  - 교사 권한은 `pending_custom_claim` 상태로만 표시
  - 서버 저장 없이 메모리 상태만 관리

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

- `src/services/firebase/firebaseAuthService.ts`
  - 학생 Anonymous Auth
  - 교사 Google popup 로그인
  - 교사 email/password 로그인
  - Auth failure의 학생/개발자 메시지 분리

- `src/services/firebase/classroomRepository.ts`
  - Firestore 저장소 계층 초안
  - 쓰기 작업은 `deferred_until_rules_ready` 상태로 차단

- `.env.example`
  - Firebase Web App 환경변수 이름만 제공
  - 실제 API key, service account, private token은 포함하지 않음

## 보안 원칙

- 학생 실명/학번 저장 금지
- 학생 제출 데이터 서버 저장 금지
- 공개 저장소에 service account, private token 저장 금지
- Firebase config는 `.env.local` 또는 Vercel Environment Variables로 관리
- Firestore Security Rules 설계 전까지 Firestore write 비활성
- 실제 Firebase Auth 전까지 교사용 비공개 해설과 학생 제출 목록을 공개하지 않음

## 현재 데이터 저장 상태

| 데이터 | 현재 처리 | 서버 저장 여부 |
|---|---|---|
| 수업코드 | 학생 세션 메모리 상태 | 저장 안 함 |
| 수업용 닉네임/익명 ID | 학생 세션 메모리 상태 | 저장 안 함 |
| 활동 결과 임시 저장 | 기존 localStorage | 서버 저장 안 함 |
| 교사 로그인 | Firebase Auth Google/email 연결 | 세션만 메모리 저장 |
| 제출 목록 | placeholder | 실제 데이터 없음 |

## 다음 단계

1. Firebase console에서 Authentication providers 활성화
   - Anonymous
   - Google
   - Email/Password
2. teacher custom claim 발급 절차 수립
3. trusted `joinClassroom` endpoint 설계/구현
4. 학생 anonymous Auth UID와 수업 멤버십 연결
5. Firestore 데이터 모델을 실제 서비스 계층에 연결
6. 학생 제출 저장 기능을 beta 단계에서 제한적으로 활성화

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
- `/teacher/dashboard`는 교사 세션이 있을 때만 대시보드 placeholder를 표시한다.
- 인증 전 교사용 비공개 패널은 표시되지 않는다.
- Firestore 저장 함수는 아직 활성화되지 않는다.
- `npm run typecheck`, `npm test`, `npm run build`가 통과해야 한다.
