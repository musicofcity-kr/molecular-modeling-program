# Firebase Admin 환경변수 연결 절차

작성일: 2026-07-02  
대상 앱: `apps/workbench`  
목표: Vercel Function `/api/create-classroom`, `/api/join-classroom`에서 Firebase Admin SDK를 사용할 수 있게 한다.

## 1. 원칙

- Firebase service account JSON은 GitHub에 커밋하지 않는다.
- service account JSON, base64 변환 파일, `.env.local`은 ChatGPT/Claude 등 외부 도구에 업로드하지 않는다.
- Vercel에는 서버 전용 환경변수로만 넣는다.
- 변수 이름은 `FIREBASE_SERVICE_ACCOUNT_BASE64`를 사용한다.
- 절대 `VITE_FIREBASE_SERVICE_ACCOUNT_BASE64`처럼 `VITE_` 접두사를 붙이지 않는다.

## 2. Firebase에서 service account JSON 받기

Firebase Console에서 다음 순서로 진행한다.

1. 프로젝트 설정
2. 서비스 계정
3. Firebase Admin SDK
4. 새 비공개 키 생성
5. JSON 파일 다운로드

다운로드한 파일은 프로젝트 안에 넣는다면 반드시 다음처럼 gitignored 경로에 둔다.

```text
apps/workbench/.secrets/firebase-service-account.json
```

루트 `.gitignore`는 `.secrets/`, `*service-account*.json`, `*serviceAccount*.json`을 제외하도록 설정되어 있다.

## 3. base64 환경변수 파일 생성

```powershell
cd C:\all\molecule-modeling-skill-package\apps\workbench
npm run firebase:admin-env -- .secrets\firebase-service-account.json
```

성공하면 다음 파일이 만들어진다.

```text
apps/workbench/.secrets/FIREBASE_SERVICE_ACCOUNT_BASE64.txt
```

이 파일은 비밀값이다. GitHub에 올리지 않는다.

스크립트 자체 점검만 하려면 다음을 실행한다.

```powershell
npm run firebase:admin-env -- --self-test
```

## 4. Vercel Dashboard에 넣기

Vercel Dashboard에서 다음 순서로 진행한다.

1. `molecular-modeling-program` 프로젝트 열기
2. `Settings`
3. `Environment Variables`
4. 새 변수 추가

입력값:

```text
Name: FIREBASE_SERVICE_ACCOUNT_BASE64
Value: .secrets/FIREBASE_SERVICE_ACCOUNT_BASE64.txt 파일 내용 전체
Environment: Production, Preview
```

Development까지 연결하려면 Development도 선택할 수 있지만, 로컬 테스트가 필요할 때만 사용한다.

## 5. Vercel CLI 대안

Dashboard 대신 CLI를 쓸 경우:

```powershell
Get-Content .secrets\FIREBASE_SERVICE_ACCOUNT_BASE64.txt | npx vercel env add FIREBASE_SERVICE_ACCOUNT_BASE64 production
Get-Content .secrets\FIREBASE_SERVICE_ACCOUNT_BASE64.txt | npx vercel env add FIREBASE_SERVICE_ACCOUNT_BASE64 preview
```

이미 같은 이름의 환경변수가 있으면 Vercel이 거부할 수 있다. 이 경우 Dashboard에서 기존 값을 수정하거나, 의도적으로 교체할 때만 `vercel env rm` 후 다시 추가한다.

## 6. 연결 후 확인

환경변수를 추가한 뒤 GitHub `main`에 새 커밋을 푸시하거나 Vercel에서 Redeploy를 실행한다.

배포 후 기대 결과:

- `POST /api/create-classroom`은 더 이상 `server_not_configured`가 아니어야 한다.
- 단, 요청 body가 비어 있으면 `invalid_request` 또는 인증 관련 실패가 정상이다.
- 교사 계정에 teacher custom claim이 없으면 `unauthorized`가 정상이다.
- `POST /api/join-classroom`도 Admin 설정 누락 503에서 벗어나야 한다.

실제 수업방 생성 성공 조건:

1. 교사 Firebase Auth 로그인 성공
2. 교사 UID에 `teacher: true` 또는 `role: "teacher"` custom claim 부여
3. Vercel에 `FIREBASE_SERVICE_ACCOUNT_BASE64` 등록
4. Vercel 재배포 완료
5. 교사용 화면에서 수업방 만들기 실행

teacher custom claim 발급/회수 절차는 다음 문서를 따른다.

```text
docs/TEACHER_CUSTOM_CLAIM_SETUP.md
```

## 7. 아직 남은 보안 작업

- service account 권한 최소화 검토
- 입장 확인코드 최소 길이, 회전, 재발급 운영 절차 확정
- 실제 학생 제출 저장 beta 운영 전 Firestore rules 재검증
