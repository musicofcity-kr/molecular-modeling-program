# Firestore Security Rules Design

작성일: 2026-07-01  
상태: Firestore 수업방/제출 저장 MVP 연결, trusted join endpoint 초안 구현

## 1. 목적

`다양한 분자의 분자구조 모델링` 앱에서 학생 활동 결과와 교사용 피드백을 Firestore에 저장하기 전에 권한 모델, 데이터 경계, Security Rules, 테스트 기준을 먼저 확정한다.

현재 `localStorage` 기반 임시 저장은 유지한다. Firestore 저장은 Security
Rules가 허용하는 교사용 수업방 생성, published 활동 템플릿 생성, 학생 제출
snapshot 생성, 교사 제출 조회/피드백 update 범위에서만 제한적으로 시도한다.

2026-07-01 Auth 1단계에서는 Firebase Web SDK 초기화, 학생 Anonymous Auth,
교사용 Google/email 로그인을 연결했다.

2026-07-02 단계에서는 교사용 로그인 뒤 ID token custom claims를 읽어
`authorized`, `pending_custom_claim`, `not_checked` 상태를 구분한다. 또한
학생 수업코드 입장에 `joinClassroom` 연결 지점을 추가했다.

2026-07-02 다음 단계에서는 Firestore client service를 연결했다. 단,
학생 멤버십 문서 생성은 여전히 client write로 허용하지 않는다. 따라서 학생
서버 제출은 `/classrooms/{classCode}/students/{uid}` 멤버십 문서가 trusted
경로로 미리 생성된 경우에만 성공한다. 멤버십이 없으면 앱은 localStorage
제출함을 유지하고 서버 제출 실패 메시지를 분리해 표시한다.

2026-07-02 추가 단계에서는 Vercel Function `/api/create-classroom`과
`/api/join-classroom`을 추가했다. `/api/create-classroom`은 Firebase Admin
SDK로 교사 ID token과 teacher custom claim을 검증한 뒤 수업방 문서를 만든다.
`/api/join-classroom`은 학생 ID token을 검증하고 기존 수업방의 `joinEnabled`,
`joinCodeHash`를 확인한 뒤 `/classrooms/{classCode}/students/{uid}` 멤버십
문서를 생성한다. 브라우저는 여전히 멤버십 문서를 직접 생성할 수 없다.

2026-07-07 업데이트에서는 신규 서버 수업방의 `joinCodeHash`를
`server-join-code-v3` salted SHA-256 형식으로 변경했다. 수업방별 랜덤
`joinCodeSalt`를 classroom 문서에 저장하고, `/api/join-classroom`은 v3 salt
검증을 우선 사용한다. 기존 v2 서버 해시와 v1 client 해시는 기존 교실 호환
검증 전용으로만 유지한다.

## 2. 현재 유지할 원칙

- 학생은 회원가입하지 않는 UX를 유지한다.
- Firestore 쓰기 권한 판정에는 요청자 식별이 필요하므로 학생은 내부적으로 Firebase Anonymous Auth 또는 신뢰된 join endpoint를 통해 익명 UID를 가진다.
- 교사는 Firebase Auth 기반 Google 로그인 또는 이메일 로그인을 사용한다.
- 교사 권한은 custom claims 또는 서버가 검증한 교사 멤버십 문서로 판정한다.
- 학생 실명, 학번, 전화번호, 이메일은 저장하지 않는다.
- AI API key, service account, private token은 브라우저와 GitHub에 노출하지 않는다.
- Firestore production write는 rules test를 통과한 문서 shape와 권한 범위에서만 시도한다.

## 3. 신뢰 경계

| 영역 | 신뢰 수준 | 원칙 |
|---|---:|---|
| 브라우저 React 앱 | 낮음 | 클라이언트 값은 조작 가능하다고 본다. |
| Firebase Auth ID token | 중간 | Auth가 발급한 UID와 custom claims만 권한 판정에 사용한다. |
| Firestore Security Rules | 높음 | 모든 client-side read/write의 최종 차단선이다. |
| createClassroom 서버 엔드포인트 | 높음 | 교사 ID token과 teacher claim 검증 후 수업방 생성을 담당한다. |
| joinClassroom 서버 엔드포인트 | 높음 | 수업코드와 입장 확인코드 검증, 학생 멤버십 생성을 담당한다. |
| 교사용 AI 피드백 서버 | 높음 | API key 보관과 AI 호출을 서버에서만 처리한다. |

## 4. 권장 인증 흐름

### 학생 흐름

1. 학생이 수업코드, 입장 확인코드, 수업용 닉네임을 입력한다.
2. 앱은 Firebase Anonymous Auth로 익명 UID를 확보한다.
3. 앱은 `joinClassroom(classCode, joinCode, displayName)` 서버 엔드포인트를 호출한다.
4. 서버는 수업코드와 입장 확인코드를 검증하고 `/classrooms/{classroomId}/students/{uid}` 멤버십 문서를 생성한다.
5. 이후 학생은 자신의 UID와 멤버십 문서가 있을 때만 제출을 생성할 수 있다.

중요: Firestore Rules만으로 공개 수업코드와 입장 확인코드를 안전하게 검증하기 어렵다. 수업 입장은 서버 엔드포인트나 callable function에서 검증한다.

### 교사 흐름

1. 교사는 Google 로그인 또는 이메일 로그인으로 Firebase Auth에 로그인한다.
2. 서버 관리자 도구가 해당 UID에 `teacher: true` 또는 `role: "teacher"` custom claim을 부여한다.
3. 교사는 `/api/create-classroom`을 통해 수업방을 생성한다.
4. 교사는 자신이 소유하거나 배정된 수업방 문서만 읽고 수정한다.
5. 교사용 AI 피드백은 서버 API를 통해서만 생성하고, 교사 검토 후 학생에게 반환한다.

custom claims에는 권한 판단에 필요한 최소 정보만 둔다. 교사 이름, 학교, 수업 목록 같은 프로필 데이터는 claims에 넣지 않는다.

## 5. Firestore 데이터 모델 초안

```text
classrooms/{classroomId}
  ownerTeacherUid: string
  teacherUids: map<string, true>
  title: string
  joinCodeHash: string
  joinCodeSalt: string
  joinCodeVersion: 3
  joinEnabled: boolean
  createdAt: timestamp
  updatedAt: timestamp

classrooms/{classroomId}/public/info
  title: string
  teacherDisplayName?: string
  currentActivityTitle?: string
  updatedAt: timestamp

classrooms/{classroomId}/students/{studentUid}
  uid: string
  displayName: string
  anonymousStudentId: string
  joinedAt: timestamp
  lastActiveAt: timestamp

classrooms/{classroomId}/activityTemplates/{templateId}
  title: string
  targetMoleculeName: string
  published: boolean
  activityData: map
  createdAt: timestamp
  updatedAt: timestamp

classrooms/{classroomId}/submissions/{submissionId}
  classroomId: string
  studentUid: string
  studentDisplayName: string
  anonymousStudentId: string
  activityId: string
  snapshot: map
  status: "submitted" | "feedback_draft" | "feedback_returned"
  submittedAt: timestamp
  updatedAt: timestamp
  teacherFeedback?: map
  feedbackReturnedAt?: timestamp
```

## 6. 저장하지 않을 데이터

| 데이터 | 처리 |
|---|---|
| 학생 실명 | 저장 금지 |
| 학번 | 저장 금지 |
| 학생 이메일 | 저장 금지 |
| 전화번호 | 저장 금지 |
| AI API key | 서버 환경변수에만 저장 |
| Firebase service account | GitHub/Vercel client env 저장 금지 |
| 원본 개발자 로그 | 학생 제출 snapshot에 저장 금지 |
| 원본 SDF/MOL 대용량 데이터 | 기본 제출 snapshot에 저장 금지 |

## 7. Security Rules 설계 방향

초안 파일: `firebase/firestore.rules`

테스트 파일: `apps/workbench/src/services/firebase/firestoreRules.emulator.test.ts`

실행 명령:

```powershell
cd apps/workbench
npm run test:firestore-rules
```

기본 정책:

- 모든 문서는 default deny.
- 교사는 authenticated + teacher claim이 있어야 한다.
- 학생은 authenticated anonymous UID + 수업 멤버십 문서가 있어야 한다.
- 학생은 자신의 제출만 생성/조회한다.
- 학생은 제출 후 수정/삭제할 수 없다.
- 교사는 수업방 소유자 또는 배정 교사일 때만 제출을 읽고 피드백 필드를 수정한다.
- 교사는 학생 snapshot 본문을 임의로 바꾸지 않는다.
- 학생은 수업방 루트 문서를 읽지 않는다. 학생에게 보여줄 수업 제목 등은 `/public/info` 같은 공개 하위 문서로 분리한다.
- 학생은 `published == true`인 활동 템플릿만 읽는다.
- 수업 입장 멤버십 생성은 Firestore client write가 아니라 trusted server endpoint가 담당한다.

현재 클라이언트 구현은 이 원칙을 우회하지 않는다. `joinClassroom` endpoint가
설정되지 않았거나 실패해도 학생 멤버십 문서를 직접 만들지 않으며, 제출 write가
권한 부족으로 실패하면 브라우저 제출함 fallback을 사용한다.

## 8. Rules 테스트 기준

Firebase Emulator 기반 rules unit test를 작성한다.

필수 통과 케이스:

1. 비로그인 사용자는 모든 classroom/submission read/write가 거부된다. (자동화됨)
2. 학생 anonymous UID가 있어도 멤버십 문서가 없으면 제출 생성이 거부된다. (자동화됨)
3. 멤버십이 있는 학생은 자신의 제출만 생성할 수 있다. (자동화됨)
4. 학생 제출에는 `teacherFeedback`, `developerLogs`, `rawMolBlock`, `rawSdf`가 포함될 수 없다. (자동화됨)
5. 학생은 수업방 루트 문서를 읽지 않고 public 정보와 published 활동만 읽는다. (자동화됨)
6. 학생은 다른 학생 제출을 읽을 수 없다. (자동화됨)
7. 학생은 제출 생성 후 update/delete할 수 없다. (자동화됨)
8. teacher claim이 없는 사용자는 교사용 문서를 만들 수 없다. (자동화됨)
9. 교사는 자신이 소유하거나 배정된 수업방 제출만 읽을 수 있다. (자동화됨)
10. 교사는 feedback/status 계열 필드만 수정할 수 있다. (자동화됨)
11. 교사는 학생 snapshot과 studentUid를 바꿀 수 없다. (자동화됨)
12. 수업 멤버십 문서는 client에서 직접 생성할 수 없다. (자동화됨)
13. 예상 query에는 Rules 조건과 같은 필터가 포함되어야 한다. (다음 query 구현 단계에서 추가)
14. Google 로그인만 있고 teacher claim이 없는 사용자는 교사용 write가 거부된다. (자동화됨)
15. `teacher: false` 또는 비교사 role claim 사용자는 교사용 write가 거부된다. (자동화됨)
16. 교사도 client에서 학생 멤버십 문서를 직접 생성할 수 없다. (자동화됨)
17. 학생은 자신의 멤버십 문서 소유권 필드를 바꿀 수 없다. (자동화됨)

## 9. Query 설계 주의

Firestore Rules는 필터가 아니다. 규칙상 허용되는 범위와 query 조건이 맞지 않으면 전체 요청이 거부된다.

예:

- 교사용 제출 목록: `classroomId` 경로 아래에서 교사 권한 확인 후 조회한다.
- 학생 제출 목록: 학생 UID 조건 또는 own path 기준으로 조회한다.
- 전체 제출 collection group을 client에서 무조건 조회하지 않는다.

## 10. 단계별 적용 계획

### Phase A: 설계 고정

- `docs/FIRESTORE_SECURITY_RULES_DESIGN.md` 작성
- `firebase/firestore.rules` draft 작성
- current Firestore repository는 disabled 상태 유지

### Phase B: 테스트 하네스

- Firebase Emulator 설치
- Rules unit test 작성
- 허용/거부 케이스 자동화

### Phase C: 교사 Auth 연결

- Firebase Web SDK 초기화
- Google/email login 연결
- teacher custom claim 발급 절차 수립
- 교사용 화면을 실제 Auth 상태와 연결

상태: SDK 초기화와 Google/email login UI 연결은 완료. ID token의 teacher
custom claim 읽기와 UI 게이트 분리는 완료. custom claim 발급 관리자 절차와
교사용 Firestore 권한 연결은 다음 단계.

### Phase D: 학생 익명 세션 연결

- Anonymous Auth 연결
- joinClassroom 서버 엔드포인트 구현
- 수업코드와 입장 확인코드 검증 후 membership 문서 생성

상태: Anonymous Auth 시도와 config-missing fallback은 완료. `joinClassroom`
연결 지점은 추가했으나 trusted endpoint와 membership 문서 생성은 다음 단계.

### Phase E: 제한 beta 저장

- 특정 테스트 수업방에서만 제출 저장 활성화
- 교사 피드백 반환 흐름 연결
- 모니터링과 데이터 삭제 절차 확인

상태: 클라이언트 서비스 계층은 연결됨. 실제 end-to-end 성공 조건은 다음과
같다.

1. 교사 계정에 `teacher: true` 또는 `role: "teacher"` custom claim이 있어야 한다.
2. 교사가 앱에서 수업방을 생성해야 한다.
3. 학생은 Firebase Anonymous Auth UID를 가져야 한다.
4. `/api/join-classroom` 또는 관리자 작업으로 `/classrooms/{classCode}/students/{uid}` 멤버십 문서가 있어야 한다.
5. 위 조건을 만족하면 학생 제출 snapshot이 Firestore에 저장되고 교사는 수업코드로 제출 목록을 조회할 수 있다.

## 11. 남은 위험 요소

- 수업코드를 클라이언트 규칙만으로 검증하려 하면 우회 가능성이 크다.
- teacher custom claim 발급은 Admin SDK가 있는 privileged server에서만 해야 한다.
- 신규 서버 수업방의 `joinCodeHash`는 수업방별 `joinCodeSalt`가 포함된 v3 SHA-256 값이다. 기존 v1/v2 교실은 호환을 위해 계속 검증하지만, 신규 생성에는 사용하지 않는다.
- salt는 비밀값이 아니므로 짧은 입장 확인코드의 오프라인 추측 위험을 완전히 제거하지는 않는다. 운영 단계에서는 충분한 길이의 입장 확인코드, 코드 회전, 실패 횟수 제한을 함께 유지해야 한다.
- 학생 닉네임에도 개인정보가 들어올 수 있으므로 길이 제한과 안내 문구가 필요하다.
- AI 피드백 payload에 개인정보나 원본 로그가 섞이지 않도록 서버 쪽 필터가 필요하다.
- Firestore Rules 테스트 없이 production write를 켜면 교사용 자료 또는 학생 제출이 노출될 수 있다.

## 12. 참고한 공식 문서

- Firebase Security Rules 조건과 query 한계: https://firebase.google.com/docs/firestore/security/rules-conditions
- Firebase Rules unit testing: https://firebase.google.com/docs/rules/unit-tests
- Firebase Auth custom claims: https://firebase.google.com/docs/auth/admin/custom-claims
