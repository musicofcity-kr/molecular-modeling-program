# 교사용 Firebase custom claim 발급 절차

작성일: 2026-07-02  
대상 앱: `apps/workbench`  
목표: 교사용 계정에만 수업방 생성 권한을 부여한다.

## 1. 원칙

- 학생 계정에는 `teacher` 권한을 부여하지 않는다.
- 교사용 권한은 Firebase Admin SDK가 있는 신뢰된 환경에서만 부여한다.
- 브라우저 코드, Vercel 클라이언트 환경변수, GitHub 저장소에는 service account 값을 저장하지 않는다.
- 교사 권한을 부여해도 Firestore Security Rules를 우회하지 않는다. 서버 endpoint가 ID token과 custom claim을 다시 검증한다.

## 2. 사전 조건

1. Firebase Auth에서 교사용 로그인 제공업체가 활성화되어 있어야 한다.
   - Google
   - 이메일/비밀번호
2. 교사가 앱에서 한 번 로그인했거나 Firebase Console에서 교사 사용자가 생성되어 있어야 한다.
3. Firebase Admin 환경변수 준비가 끝나 있어야 한다.

Admin 환경변수 준비 문서:

```text
docs/FIREBASE_ADMIN_ENV_SETUP.md
```

## 3. 스크립트 자체 점검

```powershell
cd C:\all\molecule-modeling-skill-package\apps\workbench
npm run firebase:teacher-claim -- --self-test
```

이 명령은 Firebase에 접속하지 않고 인자 처리와 claim 병합 로직만 점검한다.

## 4. 교사 권한 부여

교사 이메일로 부여:

```powershell
cd C:\all\molecule-modeling-skill-package\apps\workbench
npm run firebase:teacher-claim -- --email teacher@example.com
```

Firebase Auth UID로 부여:

```powershell
npm run firebase:teacher-claim -- --uid <firebase-auth-uid>
```

성공하면 해당 사용자의 custom claim에 다음 값이 들어간다.

```json
{
  "teacher": true,
  "role": "teacher"
}
```

기존의 다른 custom claim은 유지한다.

## 5. 교사 권한 회수

```powershell
npm run firebase:teacher-claim -- --email teacher@example.com --revoke
```

회수 시 `teacher` claim을 제거한다. `role` 값이 `teacher`일 때만 `role`도 제거하며, 다른 역할 값은 유지한다.

## 6. 권한 반영 확인

custom claim 변경 후 교사는 반드시 다시 로그인해야 한다.

권장 순서:

1. 교사용 화면에서 로그아웃
2. 브라우저 새로고침
3. 다시 로그인
4. 수업방 생성 시도

성공 기준:

- `/api/create-classroom`이 ID token을 검증한다.
- token claim에 `teacher: true` 또는 `role: "teacher"`가 있어야 한다.
- 교사 권한이 없으면 `unauthorized`가 정상이다.

## 7. 운영 주의

- service account JSON과 `.secrets/FIREBASE_SERVICE_ACCOUNT_BASE64.txt`는 GitHub에 올리지 않는다.
- `FIREBASE_SERVICE_ACCOUNT_BASE64`는 Vercel 서버 전용 환경변수다.
- 변수 이름에 `VITE_`를 붙이지 않는다.
- 교사 권한 부여 대상 목록은 최소화한다.
- 학생 개인정보 저장과 제출 데이터 서버 저장은 별도 Security Rules 검증 후 진행한다.
