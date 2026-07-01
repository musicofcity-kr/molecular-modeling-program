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
```

4. 첫 배포를 실행
5. 배포 URL에서 윤리 가이드 게이트와 학생 입장 흐름 확인

## 3. Vercel 환경 변수

Vercel Project Settings > Environment Variables에 필요한 값만 등록한다.

Firebase를 아직 production에 연결하지 않을 경우 빈 값으로 둘 수 있다.

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
```

교사용 AI 피드백 서버를 연결할 때만 다음 값을 등록한다.

```text
VITE_AI_FEEDBACK_ENDPOINT
```

주의:

- OpenAI, Claude, Gemini API key를 `VITE_*` 환경변수로 등록하지 않는다.
- AI API key는 Vercel Function, Firebase Functions, Cloud Run 같은 서버 측 환경변수에만 저장한다.
- service account JSON, private token, `.env.local`은 GitHub에 커밋하지 않는다.

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

Firebase는 배포 직후 바로 학생 제출 저장에 연결하지 않는다.

권장 순서:

1. Firebase project 생성
2. Web app 등록
3. Firebase Auth provider 결정
   - 교사용 Google 로그인
   - 필요 시 이메일 로그인
   - 학생용 Anonymous Auth
4. Firestore 데이터 모델 확정
5. Firestore Security Rules 작성
   - 설계 문서: `docs/FIRESTORE_SECURITY_RULES_DESIGN.md`
   - 초안 파일: `firebase/firestore.rules`
6. Rules 테스트
7. 교사용 로그인 연결
8. trusted joinClassroom endpoint로 수업코드 검증과 학생 멤버십 생성
9. 제한된 beta 환경에서 학생 제출 저장 활성화

## 6. Firestore 연결 전 보안 원칙

- 학생 실명/학번 저장 금지
- 학생은 수업코드와 익명 ID 중심으로 입장하되, Firestore 권한 판정에는 Firebase Anonymous Auth UID를 사용
- 교사용 해설과 피드백 작성 화면은 인증 후에만 표시
- 수업 결과 제출은 Security Rules가 완성되기 전 production에 연결하지 않음
- 교사용 AI 피드백은 자동 채점이 아니라 교사 검토 보조로 표시
- 수업코드 검증과 학생 멤버십 문서 생성은 client-side Firestore write가 아니라 trusted server endpoint에서 처리
- teacher 권한 custom claim은 Admin SDK가 있는 privileged server에서만 발급

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
