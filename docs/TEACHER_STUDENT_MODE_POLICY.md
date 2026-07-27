# 학생/교사 모드 및 권한 정책

상태: 2026-07-27 현재 구현 기준, unreleased release candidate / 로컬 QA 완료

이 문서는 학생 학습 화면과 교사 수업 관리 화면의 역할, 인증, 데이터 저장과
표시 경계를 정의합니다. 프로덕션 또는 학교 운영 승인을 선언하는 문서가
아니며, 실제 수업 전에는 개인정보처리방침·이용약관과 운영 환경을 함께
검토해야 합니다.

## 1. 핵심 원칙

- 학생 화면은 분자 구조 탐구와 생각 작성에 집중하며 교사용 해설, 개발자 로그,
  원본 API 응답과 다른 학생 자료를 표시하지 않습니다.
- 학생은 회원가입 화면 없이 입장하지만, 서버 수업방에서는 Firebase Anonymous
  Auth UID와 trusted membership을 권한 판정에 사용합니다.
- 교사 서버 기능은 Firebase Auth와 서버가 확인한 teacher custom claim을 모두
  요구합니다.
- 브라우저의 역할·화면 상태는 권한 근거가 아닙니다. trusted endpoint와
  Firestore Security Rules가 서버 자료의 최종 경계입니다.
- 학생 로컬 활동 결과, 현재 세션의 미제출 입력, Firestore 서버 제출은 서로
  다른 저장 범위입니다.
- AI 피드백은 교사용 초안이며 자동 채점이 아닙니다. 교사 확인 전에는
  학생에게 전달하지 않습니다.

## 2. 역할과 인증 경계

### 학생

1. 학생은 수업코드, 입장 확인코드와 수업용 닉네임 또는 익명 ID를 입력합니다.
2. Firebase Web App 설정이 있는 환경에서는 Anonymous Auth로 UID와 ID token을
   확보합니다.
3. `/api/join-classroom`은 ID token, 수업코드와 입장 확인코드를 검증한 뒤
   `classrooms/{classCode}/students/{uid}` membership 문서를 생성합니다.
4. 명시적인 4xx 거절은 학생 세션 생성을 차단합니다. endpoint 5xx 또는 네트워크
   실패는 제한된 브라우저 학습 흐름을 계속할 수 있지만 trusted 가입이나 서버
   제출 성공으로 취급하지 않습니다.
5. 학생 서버 제출과 반환 피드백 조회는 `classroomJoinStatus: "joined"`와 현재
   Firebase ID token이 있을 때만 활성화됩니다.

### 교사

1. 교사는 Firebase Auth Google 또는 이메일 로그인을 사용합니다.
2. 서버 수업방 기능은 ID token에 `teacher: true` 또는
   `role: "teacher"` custom claim이 확인된 경우에만 활성화됩니다.
3. `pending_custom_claim` 또는 `not_checked` 상태는 교사 권한이 아니며 서버
   수업방 생성, 제출 목록 조회와 피드백 수정에 사용할 수 없습니다.
4. 긴급 로컬 교사 모드는 수업 화면 복구용입니다. Firebase ID token을 발급하지
   않으므로 Firestore 권한으로 사용하지 않습니다.
5. 교사는 자신이 소유하거나 `teacherUids`에 배정된 수업방의 자료만 조회·
   처리합니다.

## 3. 학생 화면

현재 학생 기본 경험은 잠금 없는 다음 5단계입니다.

1. `분자 선택`
2. `구조 만들기`
3. `구조 분석`
4. `3D 비교`
5. `생각 정리·제출`

학생 화면에는 다음 내용을 표시할 수 있습니다.

- 교사가 게시한 활동과 학습 목표
- Ketcher 간편/고급 2D 구조 편집
- RDKit.js 검증을 통과한 분자식과 평균 분자량
- 중심 원자와 전자 영역을 구분한 VSEPR 근거
- 출처 표시 참고 3D 구조와 별도 VSEPR 교육용 예상 모형
- 구조 비교 관찰과 학생 생각
- 현재 학생 본인에게 반환된 형성 피드백

학생 화면에는 다음 내용을 표시하지 않습니다.

- 교사용 정답·오개념 해설과 내부 운영 메모
- 개발자 로그, HTTP 상태, 원본 API 응답과 내부 enum
- 원본 SDF/MOL payload
- 다른 학생의 닉네임, 제출 또는 피드백
- teacher claim, Firebase service account 또는 API key

## 4. 교사 화면

권한이 확인된 교사 화면은 다음 기능을 제공할 수 있습니다.

- 수업방과 published 활동 템플릿 생성
- 담당 수업의 서버 제출 목록 조회
- 제출의 구조 확인·VSEPR·3D 출처 상태와 학생 생각 확인
- AI 또는 로컬 가드레일 기반 피드백 초안 생성
- 초안 수정, 저장과 학생 반환
- 필요한 범위의 접힌 개발자 진단 정보

교사 화면은 학생 응답을 자동으로 점수화하거나 성취도·태도·인성을 단정하지
않습니다. AI가 만든 문구도 교사가 과학적 사실, 표현과 개인정보 포함 여부를
확인하고 필요한 경우 수정한 뒤에만 반환합니다.

## 5. Trusted endpoint와 서버 기록

현재 서버 경계는 다음 흐름을 사용합니다.

```text
teacher Auth + teacher claim
  -> /api/create-classroom
  -> Firestore classroom/public/activity template

student Anonymous Auth
  -> /api/join-classroom
  -> trusted membership
  -> /api/save-submission
  -> Firestore submission

teacher Auth + assigned classroom
  -> /api/list-submissions
  -> /api/create-feedback-draft
  -> /api/update-feedback

joined student Auth
  -> /api/list-student-feedback
  -> own feedback_returned submissions only
```

- 클라이언트가 보낸 UID, role, classCode 또는 submission 소유권 주장을 그대로
  신뢰하지 않습니다.
- 학생 제출은 ID token, membership, 소유권과 feedback lock을 통과해야
  저장됩니다.
- 교사 목록·피드백 endpoint는 teacher claim과 담당 수업 범위를 확인합니다.
- 서버 응답은 현재 역할, UID, token, 수업코드와 request id 범위가 일치할 때만
  화면 상태에 반영합니다.

## 6. 로컬 활동 결과와 서버 제출 분리

| 데이터 | 저장 범위 | 완료·권한 의미 |
|---|---|---|
| 미제출 답변·진행 상태 | 현재 학생 세션 메모리 | 새로고침·역할/학생 전환 시 사라질 수 있음 |
| 명시적으로 저장한 활동 결과 | 현재 브라우저 `localStorage` | 개인 로컬 기록이며 교사 제출 아님 |
| 제출 요청 중 snapshot | 현재 학생 세션 메모리 | 서버 성공 전에는 제출 완료 아님 |
| Firestore 제출·피드백 | trusted 서버 수업방 | membership·소유권·교사 권한 적용 |

- 학생 닉네임·답변·구조 snapshot 전체를 origin-wide 브라우저 제출함
  `localStorage` fallback에 저장하지 않습니다.
- 이전 `molecule-workbench-activity-submissions` 키는 앱 시작 시 정리합니다.
- 로컬 활동 결과 내보내기의 세부 계약은
  `docs/ACTIVITY_RESULT_EXPORT_POLICY.md`를 따릅니다.
- Firestore 자료의 보유·삭제 계약은 `docs/PRIVACY_POLICY.md`와 실제 배포
  운영 절차를 따릅니다.

## 7. 역할·세션 전환과 민감 상태 초기화

로그아웃, 학생 identity 변경, 역할 변경, 브라우저 경로 전환 또는 새 수업
세션에서는 이전 사용자의 민감 상태를 새 역할로 넘기지 않습니다.

다음 상태를 초기화하거나 현재 identity 범위에서 분리합니다.

- 편집 중 구조, RDKit 검증, VSEPR와 3D/PubChem 파생 상태
- 학생 답변, 제출 진행 상태와 trusted 완료 영수증
- 학생 반환 피드백 캐시와 비동기 요청 소유권
- 교사가 불러온 서버 제출 목록, 선택 제출과 AI 피드백 초안
- 교사 요청의 UID, token, classCode와 request id scope

역할 또는 identity가 바뀐 뒤 도착한 이전 비동기 응답은 무시합니다.
이용자가 명시적으로 저장한 비식별 로컬 활동 결과는 별도의 삭제 행동 전까지
남을 수 있으므로 공유 기기에서는 수업 종료 시 삭제해야 합니다.

## 8. 화학·교육 표시 경계

- RDKit.js만 분자식, 평균 분자량과 canonical SMILES의 구조 검증 기준입니다.
- 검증 실패·query·모호한 구조에는 계산값과 확신형 VSEPR/3D 결과를 표시하지
  않습니다.
- 교사용 예상값은 수업 안내 metadata이며 RDKit.js 결과를 덮어쓰지 않습니다.
- PubChem/static 좌표는 출처가 표시된 참고 3D 자료이며 계산 기준값이 아닙니다.
- VSEPR 모형은 교육용 예상이며 실험 또는 계산화학 최적화 좌표가 아닙니다.
- 비교 관찰과 학생 생각은 자동 채점하지 않습니다.

## 9. 개인정보와 운영 책임

- 학생에게 실명, 학번, 이메일, 전화번호 입력을 요구하지 않습니다.
- 닉네임과 자유서술에는 개인정보가 포함될 수 있으므로 학생 안내와 교사 검토가
  필요합니다.
- AI provider가 설정된 경우 학생 자유서술 일부가 서버에서 외부 provider로
  전송될 수 있습니다. 운영자는 실제 provider와 처리 조건을 배포 문서에
  명시해야 합니다.
- 학생 자료의 보유 기간과 관리자 삭제 절차가 확정되지 않은 환경에서는 서버
  제출을 활성화하지 않습니다.
- 교사 Auth나 화면 표시만으로 개인정보 처리와 학교 운영 승인이 완료된 것으로
  보지 않습니다.

## 10. 비목표

- 자동 채점, 점수 또는 등급 산출
- 학생 실명·학번 기반 로그인
- 브라우저 role 값만으로 교사 권한 부여
- 학생이 다른 학생 제출을 조회하거나 제출 후 서버 자료를 임의 수정·삭제
- 원본 MOL/SDF, 개발자 로그 또는 비밀키를 학생 제출에 저장
- 교사 검토 없는 AI 피드백 자동 전달
- 보유·삭제·학교 검토 절차 없는 production 학생 자료 수집
