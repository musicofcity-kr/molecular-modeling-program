# 학생/교사 진입 분리 및 Firebase 준비 기록

작성일: 2026-07-01  
상태: 인증/권한 구조 뼈대 준비 완료, 실제 Firebase Auth/Firestore 저장은 미연동

## 목적

`다양한 분자의 분자구조 모델링` 앱을 GitHub + Vercel + Firebase 기반 배포로 확장하기 전에 학생용 화면과 교사용 화면을 구조적으로 분리한다.

이번 단계의 목표는 실제 서버 저장이 아니라 다음을 준비하는 것이다.

- 학생은 회원가입 없이 수업코드와 수업용 닉네임 또는 익명 ID로 입장한다.
- 교사는 Firebase Auth 기반 Google 로그인 또는 이메일 로그인을 사용할 수 있도록 UI와 권한 구조를 준비한다.
- Firestore 저장은 Auth와 Security Rules 설계 전까지 비활성 상태로 둔다.
- 기존 localStorage 기반 임시 저장은 유지한다.

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
  - 교사용 Firebase Auth 준비 상태 반환
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
  - Google 로그인 연결 준비 버튼
  - 이메일 로그인 연결 준비 폼
  - 수업방 생성 UI 초안
  - 활동 관리 UI 초안
  - 제출 목록 placeholder

- `src/config/firebaseConfig.ts`
  - Vite 환경변수 기반 Firebase Web App config 읽기
  - 실제 Firebase SDK 초기화는 아직 하지 않음

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
| 교사 로그인 | UI 준비 상태 | 실제 인증 안 함 |
| 제출 목록 | placeholder | 실제 데이터 없음 |

## 다음 단계

1. Vercel 배포용 root/build 설정 확인
2. Firebase project 생성
3. Firebase Auth provider 결정
   - Google 로그인
   - 이메일 로그인
4. Firestore 데이터 모델 확정
5. Firestore Security Rules 작성
6. Rules 테스트
7. 실제 교사용 로그인 연결
8. 학생 제출 저장 기능을 beta 단계에서 제한적으로 활성화

## 검증 기준

이번 단계 완료 조건:

- `/student`에서 학생 입장 화면이 표시된다.
- 학생 입장 후 `/student/workbench`에서 기존 분자구조 모델링 활동 흐름이 표시된다.
- `/teacher`에서 교사용 로그인 준비 화면이 표시된다.
- `/teacher/dashboard`는 교사 세션이 있을 때만 대시보드 placeholder를 표시한다.
- 인증 전 교사용 비공개 패널은 표시되지 않는다.
- Firestore 저장 함수는 아직 활성화되지 않는다.
- `npm run typecheck`, `npm test`, `npm run build`가 통과해야 한다.
