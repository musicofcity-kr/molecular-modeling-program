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
- 교사용 AI 피드백 workflow는 서버 API endpoint 연결 준비 상태

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
- AI 피드백은 서버리스 API 또는 별도 백엔드에서 처리하고, 프론트엔드는 `VITE_AI_FEEDBACK_ENDPOINT`만 호출합니다.
- Firebase service account, private token은 공개 저장소에 커밋하지 않습니다.

## 배포 단계 원칙

1. GitHub `main` 브랜치를 Vercel production 기준으로 사용합니다.
2. Firebase Auth/Firestore는 보안 규칙 설계 전까지 production 저장 기능에 연결하지 않습니다.
3. 학생 실명, 학번, 민감정보는 저장하지 않습니다.
4. RDKit.js 검증을 통과하지 않은 분자식과 분자량은 학생에게 결과로 표시하지 않습니다.
5. PubChem 3D 구조와 VSEPR 교육용 예측 모형은 실제 계산/실험값처럼 혼동해서 표시하지 않습니다.
