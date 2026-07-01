# 교사용 AI 피드백 워크플로

## 목적

학생이 제출한 활동 결과를 교사가 확인하고, AI API를 보조 도구로 사용하여 형성 피드백 초안을 만든 뒤 학생에게 전달하는 구조를 준비한다.

## 현재 MVP 동작

1. 학생은 `활동 결과 정리`에서 `교사에게 제출하기`를 누른다.
2. 제출 자료는 현재 브라우저의 교사용 제출함에 임시 저장된다.
3. 교사는 교사용 화면의 `학생 제출 자료와 AI 피드백` 패널에서 제출 자료를 확인한다.
4. 교사는 `AI 피드백 초안 만들기`를 누른다.
5. `VITE_AI_FEEDBACK_ENDPOINT`가 설정되어 있으면 해당 서버 엔드포인트에 제출 요약을 POST한다.
6. 엔드포인트가 설정되어 있지 않으면 로컬 가드레일 기반 검토 초안을 만든다.
7. 교사는 초안을 확인하고 필요한 경우 수정한 뒤 `교사 확인 후 학생에게 전달`을 누른다.
8. 학생 화면에는 전달 완료된 피드백만 표시된다.

## 보안 원칙

- 브라우저 코드에 AI API key를 넣지 않는다.
- OpenAI, Claude, Gemini 등 실제 API key는 서버리스 함수 또는 백엔드에서만 사용한다.
- 학생 실명, 학번, 전화번호, 이메일을 피드백 요청 payload에 넣지 않는다.
- 현재 MVP는 서버 저장이 아니라 localStorage 기반 임시 제출함이다.
- production 제출/피드백 기능은 Firebase Auth, Firestore Security Rules, 교사 권한 확인이 준비된 뒤 활성화한다.

## AI 응답 가드레일

AI 피드백은 다음 원칙을 따라야 한다.

- 자동 채점이나 점수 산출을 하지 않는다.
- 학생의 성취도, 인성, 태도를 단정하지 않는다.
- 화학적으로 검증되지 않은 값을 사실처럼 말하지 않는다.
- RDKit.js 구조 확인값, 3D 좌표 자료, VSEPR 예측 모형의 역할을 구분한다.
- 학생에게 바로 정답을 주기보다 다시 생각할 질문을 포함한다.
- 교사 확인 전에는 학생에게 전달하지 않는다.

## 서버 엔드포인트 요청 형태

프론트엔드는 `VITE_AI_FEEDBACK_ENDPOINT`에 다음 형태의 JSON을 POST한다.

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

- Firebase Auth 기반 교사 인증 연결
- Firestore 제출함 컬렉션 설계
- 학생별 실명 없는 익명 제출 ID 정책 확정
- Vercel Functions 또는 Firebase Functions 기반 AI 피드백 프록시 구현
- 프롬프트/응답 로그에서 개인정보를 제거하는 서버 검증 추가
