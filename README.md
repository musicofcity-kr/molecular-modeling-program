# 다양한 분자의 분자구조 모델링

고등학교 화학 수업에서 분자 구조를 그리고 확인하는 교육용 웹앱입니다.

이 프로젝트는 수업 활동에 필요한 분자 구조 입력, 검증, 3D 관찰, 활동 결과 정리를 안정적으로 제공하는 것을 목표로 합니다.

## 현재 상태

- React + Vite + TypeScript 기반 웹앱
- Ketcher 기반 2D 분자 구조 입력
- RDKit.js 기반 구조 확인, 분자식, 평균 분자량 계산
- 3Dmol.js 기반 3D 구조 시각화
- 정적 3D 예제와 PubChem 기반 외부 3D 자료 불러오기
- 학생 활동 흐름, 교사용 안내, 활동 결과 저장/내보내기
- 윤리 가이드 게이트, 개인정보처리방침, 이용약관 화면 포함
- Firebase Auth/Firestore 기반 수업방, 학생 제출, 교사 피드백 반환 흐름
- 교사용 AI 피드백 초안 생성 API 연결

## 앱 위치

실제 실행 앱은 다음 위치에 있습니다.

```text
apps/workbench
```

## 로컬 실행

```powershell
cd apps/workbench
npm install
npm run dev
```

기본 로컬 주소:

```text
http://127.0.0.1:5173/
```

## 검증 명령

```powershell
cd apps/workbench
npm run typecheck
npm test
npm run build
```

## 학생 사용 흐름

1. 윤리 가이드와 약관을 확인한 뒤 시작합니다.
2. `학생 활동`에서 교사가 안내한 수업코드, 입장 확인코드, 수업용 이름을 입력합니다.
3. 오늘의 탐구 활동을 선택합니다. 서버 수업방에 활동 템플릿이 지정된 경우 지정된 활동만 표시됩니다.
4. 예상 분자식, 예상 분자량, 구조를 그렇게 그린 이유를 먼저 작성합니다.
5. 분자 예시를 불러오거나 직접 구조를 그립니다.
6. `내 구조 확인하기`로 RDKit.js 검증값인 분자식과 평균 분자량을 확인합니다.
7. 참고 3D 구조와 입체 구조 예측을 관찰하고 비교합니다.
8. 활동 결과를 정리한 뒤 `교사에게 제출하기`를 누릅니다.
9. 교사가 피드백을 반환하면 같은 수업방에 다시 입장해 피드백을 확인합니다.

## 교사 사용 흐름

1. `교사용 안내`에서 Firebase Auth 기반 Google 또는 이메일 로그인으로 입장합니다.
2. 교사 계정에는 Firebase Admin SDK로 `teacher: true` custom claim이 부여되어 있어야 합니다.
3. 수업명, 수업코드, 학생 입장 확인코드, 사용할 활동 템플릿을 정해 수업방을 만듭니다.
4. 학생에게 수업코드와 입장 확인코드를 안내합니다.
5. `서버 제출 목록 불러오기`로 학생 제출 자료를 확인합니다.
6. 제출 자료를 선택해 `AI 피드백 초안 만들기`를 실행합니다.
7. 초안을 교사가 검토하고 수정한 뒤 `교사 확인 후 학생에게 전달`로 반환합니다.

AI 피드백은 자동 채점이 아닙니다. 학생에게 전달하기 전 교사가 과학 내용,
표현, 개인정보 포함 여부를 반드시 확인해야 합니다.

## Vercel 배포 설정

GitHub 저장소를 Vercel에 연결할 때 다음 값을 사용합니다.

```text
Framework Preset: Vite
Root Directory: apps/workbench
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

자세한 배포 절차는 [docs/VERCEL_FIREBASE_DEPLOYMENT_RUNBOOK.md](docs/VERCEL_FIREBASE_DEPLOYMENT_RUNBOOK.md)를 참고합니다.

## 환경 변수

환경 변수 예시는 [apps/workbench/.env.example](apps/workbench/.env.example)에 있습니다.

주의:

- OpenAI, Claude, Gemini 같은 AI API key를 브라우저용 `VITE_*` 변수에 넣지 않습니다.
- AI 피드백은 `/api/create-feedback-draft` Vercel Function에서 서버 측으로 처리합니다.
- 별도 AI 프록시 서버를 쓰려면 `AI_FEEDBACK_ENDPOINT`를 등록합니다.
- 내장 OpenAI 호환 호출을 쓰려면 Vercel Environment Variables에 `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`을 등록합니다.
- Firebase service account, private token은 공개 저장소에 커밋하지 않습니다.

권장 AI 환경변수:

```text
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

AI API 키가 없거나 호출이 실패하면 앱은 로컬 가드레일 기반 교사용 피드백 초안을 생성합니다.

## 사용 매뉴얼

자세한 화면별 사용법은 [docs/MOLECULE_MODELING_WORKBENCH_USER_MANUAL.md](docs/MOLECULE_MODELING_WORKBENCH_USER_MANUAL.md)를 참고합니다.

## 배포 단계 원칙

1. GitHub `main` 브랜치를 Vercel production 기준으로 사용합니다.
2. Firebase Auth/Firestore는 보안 규칙 설계 전까지 production 저장 기능에 연결하지 않습니다.
3. 학생 실명, 학번, 민감정보는 저장하지 않습니다.
4. RDKit.js 검증을 통과하지 않은 분자식과 분자량은 학생에게 결과로 표시하지 않습니다.
5. PubChem 3D 구조와 VSEPR 교육용 예측 모형은 실제 계산/실험값처럼 혼동해서 표시하지 않습니다.
