# Vercel/Firebase 배포 런북

작성일: 2026-07-01  
대상 저장소: `musicofcity-kr/molecular-modeling-program`  
현재 production 기준 브랜치: `main`

## 1. 현재 배포 준비 상태

- GitHub 원격 저장소 연결 완료
- `main` 브랜치 업로드 완료
- `feature/3d-structure-availability-pipeline` 브랜치도 원격에 보존
- 실제 앱 루트는 `apps/workbench`
- Vercel SPA rewrite 설정은 `apps/workbench/vercel.json`에 있음
- Firebase 환경변수 이름은 `apps/workbench/.env.example`에 정리됨
- Firebase Admin service account 변환 절차는 `docs/FIREBASE_ADMIN_ENV_SETUP.md`에 있음
- 교사용 Firebase custom claim 발급/회수 절차는 `docs/TEACHER_CUSTOM_CLAIM_SETUP.md`에 있음

## 2. Vercel 프로젝트 생성

Vercel Dashboard에서 다음 순서로 진행한다.

1. `Add New Project`
2. GitHub 저장소 `musicofcity-kr/molecular-modeling-program` 선택
3. 프로젝트 설정을 다음과 같이 입력

```text
Framework Preset: Vite
Root Directory: apps/workbench
Install Command: npm install
Build Command: npm run build
Output Directory: dist
Production Branch: main
Node.js Version: 22.x
```

4. 첫 배포를 실행
5. 배포 URL에서 윤리 가이드 게이트와 학생 입장 흐름 확인

## 3. Vercel 환경 변수

Vercel Project Settings > Environment Variables에 필요한 값만 등록한다.

Firebase를 아직 production에 연결하지 않을 경우 빈 값으로 둘 수 있다.
Firebase Auth 1단계부터 실제 로그인을 쓰려면 아래 값은 Vercel Production,
Preview, Development 환경에 맞게 등록해야 한다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
```

학생 수업코드 서버 확인과 Firestore 멤버십 생성을 사용하려면 Vercel Function
전용으로 다음 값 중 하나를 등록한다. 이 값들은 절대 `VITE_` 접두사를 붙이지
않는다.

```text
FIREBASE_SERVICE_ACCOUNT_BASE64
```

권장 방식은 `FIREBASE_SERVICE_ACCOUNT_BASE64` 단일 변수다. 로컬에서 Firebase
service account JSON을 base64 값으로 변환할 때는 다음 명령을 사용한다.

```powershell
cd apps/workbench
npm run firebase:admin-env -- .secrets\firebase-service-account.json
```

상세 절차는 `docs/FIREBASE_ADMIN_ENV_SETUP.md`를 따른다.

교사용 계정에 수업방 생성 권한을 부여할 때는 Admin 환경변수 준비 후 다음 명령을 사용한다.

```powershell
cd apps/workbench
npm run firebase:teacher-claim -- --email teacher@example.com
```

상세 절차와 권한 회수 방법은 `docs/TEACHER_CUSTOM_CLAIM_SETUP.md`를 따른다.

또는 분리 입력 방식:

```text
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

서버 함수 런타임 메모:

- `/api/create-classroom`과 `/api/join-classroom`은 Firebase Admin SDK를 쓰는 Vercel Node.js Function이다.
- Vercel Node 24 배포 로그에서 `firebase-admin@14.1.0`의 하위 의존성
  `jwks-rsa@4.x -> jose@6.x` 조합이 `ERR_REQUIRE_ESM`으로 실패한 사례가
  확인되어, 현재는 `firebase-admin@13.5.0`과 Node `22.x`로 고정한다.

교사용 AI 피드백 서버를 연결할 때만 다음 값을 등록한다.

```text
AI_FEEDBACK_ENDPOINT
```

별도 AI 프록시 서버 없이 Vercel Function에서 Gemini generateContent API를
직접 호출하려면 다음 값을 등록한다.

```text
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_BASE_URL
```

권장 최소 설정:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

동작 우선순위:

1. `AI_FEEDBACK_ENDPOINT`가 있으면 외부 AI 피드백 프록시를 호출한다.
2. `AI_FEEDBACK_ENDPOINT`가 없고 `GEMINI_API_KEY`가 있으면 내장 Gemini 호출을 사용한다.
3. 둘 다 없거나 호출이 실패하면 로컬 가드레일 기반 피드백 초안을 만든다.

주의:

- Gemini 같은 AI provider API key를 `VITE_*` 환경변수로 등록하지 않는다.
- AI API key와 외부 AI endpoint는 Vercel Function, Firebase Functions, Cloud Run 같은 서버 측 환경변수에만 저장한다.
- AI 피드백은 자동 채점이 아니라 교사 검토용 초안이다. 학생에게 전달하기 전에 교사가 반드시 확인한다.
- `VITE_AI_FEEDBACK_ENDPOINT`는 과거 로컬 실험용 변수이며 production에서는 사용하지 않는다.
- service account JSON, private token, `.env.local`은 GitHub에 커밋하지 않는다.
- Firebase Admin service account 값은 GitHub에 저장하지 않고 Vercel Environment Variables에만 등록한다.

## 4. 첫 배포 후 확인 항목

브라우저에서 다음 흐름을 직접 확인한다.

- 윤리 가이드 확인 후 시작
- 학생 활동 입장
- 오늘의 활동 선택
- 분자 예시 불러오기
- 내 구조 확인하기
- 분자식과 평균 분자량 표시
- 3D 구조 보기
- 활동 결과 정리
- 임시 저장/보고서 저장/활동지 인쇄
- 교사용 안내 진입

개발자 관점 확인:

- 콘솔 치명 오류 없음
- Vercel build log에서 `npm run build` 성공
- RDKit.js, Ketcher, 3Dmol.js asset 로딩 실패 없음
- PubChem 네트워크 실패 시 학생용 안내와 내부 로그가 분리됨

## 5. Firebase 도입 순서

Firebase는 단계적으로 연결한다. 현재 앱은 Firebase Auth, 제한된 Firestore
서비스 MVP, Vercel Function 기반 학생 수업방 입장 endpoint를 갖고 있다.
단, 서버 저장은 Vercel의 `VITE_FIREBASE_*` 및 Firebase Admin 서버 환경변수와
Security Rules가 준비된 환경에서만 정상 동작하며, 실패 시 브라우저-local
활동 흐름으로 fallback한다.

권장 순서:

1. Firebase project 생성
2. Web app 등록
3. Firebase Auth provider 결정
   - 교사용 Google 로그인 활성화
   - 필요 시 이메일/비밀번호 로그인 활성화
   - 학생용 Anonymous Auth 활성화
4. Vercel Environment Variables에 `VITE_FIREBASE_*` Web App config 등록
5. teacher custom claim 발급 스크립트와 운영 절차 확인
6. trusted `joinClassroom` endpoint 환경변수 연결
7. Firestore 데이터 모델 확정
8. Firestore Security Rules 작성
   - 설계 문서: `docs/FIRESTORE_SECURITY_RULES_DESIGN.md`
   - 초안 파일: `firebase/firestore.rules`
9. Rules 테스트
10. trusted joinClassroom endpoint로 수업코드 + 입장 확인코드 검증과 학생 멤버십 생성 확인
11. 제한된 beta 환경에서 학생 제출 저장 활성화

현재 Auth 1단계 범위:

- 학생 Anonymous Auth 시도
- config가 없으면 로컬 임시 세션으로 fallback
- 교사용 Google/email 로그인 UI와 SDK 호출
- 로그인 성공 후 `/teacher/dashboard` placeholder 이동
- 수업방 생성 endpoint에서 teacher custom claim 검증
- Firestore write는 수업방/멤버십/규칙 조건을 만족할 때만 제한적으로 시도하고, 실패 시 local fallback

## 6. Firestore 연결 전 보안 원칙

- 학생 실명/학번 저장 금지
- 학생은 수업코드, 입장 확인코드, 익명 ID 중심으로 입장하되, Firestore 권한 판정에는 Firebase Anonymous Auth UID를 사용
- 교사용 해설과 피드백 작성 화면은 인증 후에만 표시
- 수업 결과 제출은 Security Rules가 완성되기 전 production에 연결하지 않음
- 교사용 AI 피드백은 자동 채점이 아니라 교사 검토 보조로 표시
- 교사용 수업방 생성, 수업코드와 입장 확인코드 검증, 학생 멤버십 문서 생성은 client-side Firestore write가 아니라 trusted server endpoint에서 처리
- teacher 권한 custom claim은 Admin SDK가 있는 privileged server에서만 발급

## 6.1 Trusted classroom endpoint 확인

Firebase Admin 환경변수 연결 전에는 다음 endpoint가 안전 fallback을 반환해야 한다.

```text
POST /api/create-classroom -> 503 server_not_configured
POST /api/join-classroom -> 503 server_not_configured
```

Firebase Admin 환경변수 연결 후에는 다음 흐름을 확인한다.

1. 교사 계정에 `teacher: true` 또는 `role: "teacher"` custom claim 부여
2. 교사 로그인 후 수업명, 수업코드, 입장 확인코드, 활동 템플릿 선택
3. `/api/create-classroom`이 ID token을 검증하고 Firestore 수업방 문서 생성
4. 학생은 수업코드와 입장 확인코드로 입장
5. `/api/join-classroom`이 학생 Anonymous ID token과 입장 확인코드를 검증하고 학생 멤버십 문서 생성

## 7. 배포 전 로컬 검증 명령

```powershell
cd apps/workbench
npm run typecheck
npm test
npm run build
```

알려진 build 경고:

- 3Dmol.js 번들에서 `eval` 관련 경고가 발생할 수 있음
- 일부 chunk size 경고가 발생할 수 있음
- 현재는 동작 차단 요소가 아니지만 production 배포 후 성능 점검 대상

## 8. 다음 작업 후보

1. Vercel production 첫 배포
2. 배포 URL 기준 브라우저 QA
3. Firebase Auth 교사용 로그인 실제 연결
4. Firestore rules 초안 작성
5. AI 피드백용 서버리스 API 구현
6. classroom pilot용 활동 템플릿 정리
