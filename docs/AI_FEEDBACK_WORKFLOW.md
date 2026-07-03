# 교사용 AI 피드백 워크플로

## 목적

학생이 제출한 활동 결과를 교사가 확인하고, AI API를 보조 도구로 사용하여 형성 피드백 초안을 만든 뒤 학생에게 전달하는 구조를 준비한다.

## 현재 MVP 동작

1. 학생은 `활동 결과 정리`에서 `교사에게 제출하기`를 누른다.
2. 제출 자료는 브라우저 제출함에 먼저 보관되고, Firebase Auth 수업방 입장이 확인된 경우 `/api/save-submission`을 통해 Firestore 서버 제출함에도 저장된다.
3. 교사는 교사용 화면의 `학생 제출 자료와 AI 피드백` 패널에서 제출 자료를 확인한다.
4. 교사는 `AI 피드백 초안 만들기`를 누른다.
5. 교사용 화면은 제출 원문을 브라우저에서 AI 서버로 직접 보내지 않고 `/api/create-feedback-draft`에 `idToken`, `classCode`, `submissionId`만 보낸다.
6. `/api/create-feedback-draft`는 교사 권한과 수업방 배정을 확인한 뒤 Firestore 제출 문서를 읽어 피드백 초안을 만든다.
7. 서버 환경변수 `AI_FEEDBACK_ENDPOINT`가 설정되어 있으면 해당 서버 엔드포인트에 최소 제출 요약을 POST한다.
8. 엔드포인트가 설정되어 있지 않거나 실패하면 로컬 가드레일 기반 검토 초안을 만든다.
9. 교사는 초안을 확인하고 필요한 경우 수정한 뒤 `교사 확인 후 학생에게 전달`을 누른다.
10. 교사용 화면은 `/api/update-feedback`을 우선 사용해 Firestore 제출 문서의 `teacherFeedback`, `status`, `feedbackReturnedAt`만 갱신한다.
11. 학생이 같은 수업방에 다시 입장하면 `/api/list-student-feedback`을 통해 본인 제출 중 `feedback_returned` 상태의 피드백만 불러와 학생 화면에 표시한다.

## 보안 원칙

- 브라우저 코드에 AI API key를 넣지 않는다.
- OpenAI, Claude, Gemini 등 실제 API key는 서버리스 함수 또는 백엔드에서만 사용한다.
- 학생 실명, 학번, 전화번호, 이메일을 피드백 요청 payload에 넣지 않는다.
- 브라우저 localStorage 제출함은 오프라인/실패 fallback으로 유지한다.
- production 서버 제출/피드백 기능은 Firebase Auth ID token, teacher custom claim, Firestore Security Rules 범위 안에서만 활성화한다.
- 학생은 본인 수업방 멤버십과 본인 UID에 연결된 반환 피드백만 조회한다.
- 교사용 AI 피드백은 자동 채점이 아니라 교사 검토 후 전달하는 형성 피드백이다.
- production에서는 `VITE_AI_FEEDBACK_ENDPOINT`를 사용하지 않는다. AI 연동 주소와 API key는 서버 환경변수에만 둔다.

## AI 응답 가드레일

AI 피드백은 다음 원칙을 따라야 한다.

- 자동 채점이나 점수 산출을 하지 않는다.
- 학생의 성취도, 인성, 태도를 단정하지 않는다.
- 화학적으로 검증되지 않은 값을 사실처럼 말하지 않는다.
- RDKit.js 구조 확인값, 3D 좌표 자료, VSEPR 예측 모형의 역할을 구분한다.
- 학생에게 바로 정답을 주기보다 다시 생각할 질문을 포함한다.
- 교사 확인 전에는 학생에게 전달하지 않는다.

## 서버 엔드포인트 요청 형태

`/api/create-feedback-draft`는 서버에서 Firestore 제출 문서를 읽은 뒤 `AI_FEEDBACK_ENDPOINT`에 다음 형태의 JSON을 POST할 수 있다.

```json
{
  "guardrails": {
    "language": "ko-KR",
    "audience": "high_school_chemistry_student",
    "noAutoGrade": true,
    "teacherReviewRequired": true,
    "avoidPersonalData": true
  },
  "submission": {
    "id": "activity-submission-...",
    "activityTitle": "물 분자 구조 그리기",
    "moleculeName": "물",
    "prediction": {},
    "validation": {},
    "threeDObservation": {},
    "vseprResult": {},
    "comparisonObservation": {},
    "answers": []
  },
  "requiredResponseShape": {
    "summary": "string",
    "strengths": ["string"],
    "improvementQuestions": ["string"],
    "studentMessage": "string",
    "teacherReviewNote": "string"
  }
}
```

## 서버 엔드포인트 응답 형태

```json
{
  "summary": "교사용 요약",
  "strengths": ["잘한 점 1", "잘한 점 2"],
  "improvementQuestions": ["다시 생각할 질문 1"],
  "studentMessage": "학생에게 전달할 피드백 본문",
  "teacherReviewNote": "교사가 확인해야 할 점"
}
```

## 다음 단계

- 실제 AI 제공자별 프록시 구현(OpenAI/Claude/Gemini 중 선택)
- 프롬프트/응답 로그에서 개인정보를 제거하는 서버 검증 추가
- 교사가 전달한 피드백을 학생 화면에서 수동 새로고침하는 UX 검토
- 수업방별 제출/피드백 운영 로그의 보관 기간 정책 확정
