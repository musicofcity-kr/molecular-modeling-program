# 다양한 분자의 분자구조 모델링 배포 전환 브리프

작성일: 2026-07-01  
상태: 수업 시연 가능한 MVP 프로토타입 완료, 배포/운영 안정화 전 단계

## 1. 문서 목적

이 문서는 현재 `Molecule Modeling Workbench` 프로젝트를 ChatGPT 프로젝트에 전달하여, GitHub/Vercel/Firebase 배포 단계의 작업 프롬프트를 생성하기 위한 기준 문서이다.

이 문서는 구현 코드를 새로 작성하기 위한 상세 설계서가 아니라, 현재 완성된 프로토타입의 상태와 배포까지 남은 의사결정, 위험 요소, 권장 작업 순서를 요약한다.

## 2. 현재 프로젝트 위치와 실행 단위

- 작업 폴더: `C:\all\molecule-modeling-skill-package`
- 실제 React/Vite 앱 위치: `apps/workbench`
- 앱 이름: `다양한 분자의 분자구조 모델링`
- 기술 스택:
  - React
  - Vite
  - TypeScript
  - Ketcher
  - RDKit.js
  - 3Dmol.js
  - Vitest
- 현재 앱 성격:
  - 브라우저 중심 정적 웹앱
  - 서버 없이도 핵심 기능 동작
  - PubChem 3D 자료 조회는 외부 API 호출에 의존

## 3. 현재 완성된 핵심 기능

현재 프로토타입은 다음 기능을 갖춘 상태다.

- 학생용 수업 활동 흐름
- 오늘의 활동 선택
- 예측 입력
- Ketcher 기반 2D 분자 구조 그리기
- 예제 분자 불러오기
- RDKit.js 기반 구조 확인
- 분자식 표시
- 평균 분자량 표시
- 3Dmol.js 기반 3D 구조 보기
- 정적 3D 예제 데이터 표시
- PubChem CID 기반 3D SDF 불러오기
- 사용자가 직접 그린 구조에 대한 수동 PubChem 후보 검색
- VSEPR/입체 구조 예상 패널
- 참고 3D 구조와 예상 입체 모형 비교
- 활동 결과 정리
- 임시 저장
- 보고서 저장
- 활동지 인쇄
- 학생 친화적 용어 정리
- 주요 섹션 접기/펼치기 UI
- 상단 단계 버튼 클릭 시 해당 섹션 이동

## 4. 현재 검증 상태

최근 확인된 검증 결과:

- `npm run typecheck`: 통과
- `npm test`: 통과
  - 31 test files
  - 182 tests
- `npm run build`: 통과

빌드 시 알려진 경고:

- `3Dmol.js` 번들에서 `eval` 관련 경고가 발생한다.
- 번들 chunk 크기가 크다는 경고가 발생한다.
- 위 경고는 현재 기능 동작을 막지는 않지만, 운영 배포 전 성능/보안 정책 검토 대상이다.

추가 기록:

- 학생/교사 진입 분리와 Firebase Auth/Firestore 준비 구조는 `docs/AUTH_FIREBASE_PREP.md`에 별도 기록한다.
- 현재 Firestore 서버 저장은 제한된 수업방/제출/피드백 MVP와 `/api/join-classroom`
  trusted endpoint로 단계 연결되어 있으며, 서버 환경변수 또는 권한이 준비되지
  않은 경우 브라우저-local 활동 흐름으로 fallback한다.

## 5. 화학/교육 설계 원칙

배포 단계에서도 다음 원칙을 유지해야 한다.

- Ketcher는 2D 구조 입력기이다.
- RDKit.js는 구조 검증, canonical smiles, 분자식, 평균 분자량 계산 기준이다.
- 3Dmol.js는 3D 좌표 데이터를 시각화하는 도구이다.
- PubChem 3D 자료는 외부 참고 자료이며, RDKit.js 검증값을 대체하지 않는다.
- VSEPR/입체 구조 예상은 교육용 예측 모델이며 실제 실험 구조처럼 표현하지 않는다.
- 검증되지 않은 구조의 분자식과 분자량을 학생에게 보여주지 않는다.
- 학생 화면에서는 `RDKit.js`, `Ketcher`, `PubChem CID`, `SDF`, `SMILES`, `MOL`, `JSON`, `developer log` 같은 기술 용어를 기본 노출하지 않는다.

## 6. 배포 전략 권장안

### 6.1 1차 배포: GitHub + Vercel

현재 상태에서는 GitHub와 Vercel을 이용한 정적 웹앱 배포가 가장 적합하다.

역할 분리:

- GitHub:
  - 코드 저장소
  - 버전 관리
  - Vercel 자동 배포 트리거
- Vercel:
  - 실제 학생/교사가 접속할 웹 URL 제공
  - GitHub push 기반 preview/production 배포
- Firebase:
  - 지금 당장 필수 아님
  - 학생 제출 저장, 교사 로그인, 수업방 관리가 필요해질 때 도입

Vercel 설정 권장값:

```text
Framework Preset: Vite
Root Directory: apps/workbench
Install Command: npm install
Build Command: npm run build
Output Directory: dist
```

공식 참고:

- Vercel Vite 배포 문서: https://vercel.com/docs/frameworks/frontend/vite
- Vercel Git 저장소 배포 문서: https://vercel.com/docs/git
- GitHub repository quickstart: https://docs.github.com/en/repositories/creating-and-managing-repositories/quickstart-for-repositories

### 6.2 Firebase는 2차 단계로 분리

Firebase는 다음 요구가 확정된 후 도입하는 것이 좋다.

- 학생 로그인
- 교사 로그인
- 수업방 코드
- 학생 활동 결과 서버 저장
- 교사용 제출 목록
- 장기 활동 기록 보관
- 활동별 피드백 기록

Firebase를 도입할 경우 우선순위:

1. Firebase project 생성
2. Web app 등록
3. Firebase config는 `.env` 또는 Vercel Environment Variables로 관리
4. Firebase Auth 도입
5. Firestore 데이터 모델 설계
6. Firestore Security Rules 작성
7. Rules simulator 또는 테스트 환경에서 권한 검증

공식 참고:

- Firebase Web setup: https://firebase.google.com/docs/web/setup
- Cloud Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started

## 7. GitHub 업로드 전 정리 사항

GitHub에 올리기 전에 다음을 확인한다.

- 불필요한 로컬 캡처 파일 정리 여부 확인
  - `.codex_local_app.png`
  - `.codex_local_app_after_wait.png`
  - `.playwright-mcp/`
  - `.test_runs/`
- 외부에서 받은 분석/참조 파일을 저장소에 포함할지 결정
  - `디자인진단 및 재설계제안.pdf`
  - `분자구조_VSEPR_시뮬레이터.html`
  - `vsepr-engine.js`
- `.gitignore`가 빌드 산출물, 로그, 임시 파일을 제외하는지 확인
- `README` 또는 배포 안내 문서 업데이트
- 공개 저장소로 둘지 private 저장소로 둘지 결정

초기에는 private 저장소를 권장한다.

## 8. Vercel 배포 전 확인 사항

Vercel 배포 전 다음을 확인한다.

- `apps/workbench`에서 `npm run build`가 통과하는가?
- `dist` 폴더가 정상 생성되는가?
- Vercel Root Directory가 `apps/workbench`로 설정되는가?
- 배포 후 다음 기능이 실제 URL에서 동작하는가?
  - 앱 첫 화면 로딩
  - 예제 분자 선택
  - Ketcher 편집기 표시
  - 구조 확인
  - 분자식/평균 분자량 표시
  - 3D 구조 보기
  - PubChem 3D 불러오기
  - 접기/펼치기 UI
  - 보고서 저장/인쇄
- 브라우저 콘솔 오류가 없는가?
- 학교/기관 네트워크에서 PubChem 접근이 차단되지 않는가?

## 9. 개인정보/보안 검토

현재 프로토타입은 서버 저장 없이 브라우저 중심으로 동작한다.

현재 저장 방식:

- 활동 결과 임시 저장은 브라우저 로컬 저장소 기반이다.
- 서버에 학생 이름, 학번, 성적, 제출물을 저장하지 않는다.

현재 외부 전송 가능성이 있는 데이터:

- PubChem 3D 자료 불러오기 시 PubChem CID 요청
- 수동 PubChem 후보 검색 시 구조 기반 후보 조회 요청
- 학생이 직접 그린 구조가 외부 검색 입력으로 사용될 수 있으므로, UI 또는 안내문에서 외부 데이터베이스 조회임을 명시해야 한다.

배포 전 보안 원칙:

- 공개 저장소에 API key, service account, private token을 넣지 않는다.
- 교사용 화면은 현재 인증이 아니라 단순 모드 전환이다.
- 교사용 비공개 해설이나 학생 데이터가 들어가면 Firebase Auth 또는 별도 인증이 필요하다.
- Firebase Firestore를 도입할 경우 `allow read, write: if true` 같은 전체 공개 규칙은 production에서 금지한다.
- 학생 개인정보를 저장하려면 개인정보 처리방침과 수업 안내 문구가 필요하다.

배포 판정:

- 현재 상태: 공개 시연용 Vercel 배포는 가능
- 학생 데이터 서버 저장 기능: 아직 배포 보류
- 교사용 인증 기능: 아직 배포 보류
- Firebase 기반 제출 시스템: 별도 설계 후 구현 필요

## 10. Firebase 도입 시 권장 데이터 모델 초안

아래는 나중에 Firebase를 붙일 때의 초안이다. 현재 구현 범위는 아니다.

```text
/classes/{classId}
  - title
  - teacherId
  - createdAt

/classes/{classId}/activities/{activityId}
  - title
  - targetMoleculeName
  - templateId
  - createdAt

/classes/{classId}/submissions/{submissionId}
  - anonymousStudentId
  - activityId
  - moleculeName
  - predictedFormula
  - rdkitFormula
  - rdkitMolecularWeight
  - reflectionText
  - createdAt

/users/{uid}
  - role: teacher | student
  - displayName
```

개인정보 최소화 권장:

- 학번/실명 저장은 기본 금지
- 필요하면 교사가 별도 오프라인 매핑표로 관리
- 앱에는 익명 ID 또는 수업용 닉네임만 저장

## 11. 운영 배포 전 남은 기술 과제

우선순위 높음:

- GitHub 저장소 정리
- Vercel 배포 설정
- 배포 URL에서 실제 기능 검증
- README/사용자 매뉴얼 최신화
- 브라우저 콘솔 오류 점검
- PubChem 실패 시 안내 메시지 확인

우선순위 중간:

- 3Dmol/RDKit/Ketcher 번들 크기 최적화
- lazy loading/code splitting 검토
- Vercel SPA rewrite 설정 검토
- 학교망에서 PubChem API 접근성 확인
- 모바일/태블릿 화면 검수

우선순위 낮음:

- Firebase Auth
- Firestore 저장
- 교사용 대시보드
- 학생 제출 목록
- 수업별 결과 분석

## 12. ChatGPT 프로젝트에 넣을 작업 프롬프트 초안

아래 프롬프트를 ChatGPT 프로젝트에 넣어 다음 단계의 작업 계획을 생성할 수 있다.

```text
현재 프로젝트는 React + Vite + TypeScript 기반의 고등학교 화학 수업용 분자구조 모델링 웹앱입니다.
프로젝트 루트는 C:\all\molecule-modeling-skill-package 이고 실제 앱은 apps/workbench 에 있습니다.

현재 앱은 수업 시연 가능한 MVP 프로토타입 단계입니다.
Ketcher 기반 2D 구조 입력, RDKit.js 기반 구조 확인과 분자식/평균 분자량 계산, 3Dmol.js 기반 3D 구조 보기, PubChem 3D 자료 불러오기, 수업 활동 흐름, 활동 결과 정리/저장/인쇄 기능이 구현되어 있습니다.

목표는 이 앱을 GitHub와 Vercel을 이용해 먼저 정적 웹앱으로 배포하고, Firebase는 학생 로그인/제출 저장 기능이 필요할 때 2차 단계로 도입하는 것입니다.

작업 계획을 다음 기준으로 만들어 주세요.

1. GitHub 업로드 전 정리 항목
2. Vercel 배포 설정값
3. Firebase를 지금 도입하지 않는 이유
4. Firebase 도입 시 필요한 Auth/Firestore 설계
5. 개인정보/보안 검토 항목
6. 배포 후 기능 검증 체크리스트
7. 번들 크기와 3Dmol eval 경고 대응 방안
8. 수업용 공개 전 교사용/학생용 권한 분리 전략
9. 1차 배포, 2차 운영 안정화, 3차 Firebase 연동 로드맵

중요 원칙:
- RDKit.js 검증값을 PubChem 값으로 덮어쓰지 말 것.
- 3Dmol.js는 3D 좌표 시각화 도구로만 볼 것.
- PubChem 3D 자료는 교육용 참고 자료로만 표시할 것.
- 학생 개인정보 저장은 Firebase Auth/Firestore Rules 설계 전까지 구현하지 말 것.
- 교사용 화면은 현재 인증이 아니므로 비공개 교사용 자료를 넣지 말 것.
- Vercel 1차 배포는 apps/workbench 를 root로 하는 Vite 정적 배포를 우선 검토할 것.
```

## 13. 다음 작업 제안

다음 실제 작업 순서는 아래가 적절하다.

1. 저장소 정리
2. `README.md` 배포용 업데이트
3. `.gitignore` 점검
4. GitHub private repository push
5. Vercel project 생성
6. `apps/workbench` root 설정으로 배포
7. 배포 URL 기능 검증
8. 배포 검증 결과를 `docs/DEPLOYMENT_CHECKLIST.md`로 기록
9. Firebase 연동 여부 재결정

## 14. 현재 상태 판정

현재 프로젝트는 `prototype` 상태이다.

수업 시연과 동료 검토에는 사용할 수 있다.  
실제 장기 운영, 학생 제출 수집, 교사 인증, 수업별 기록 저장은 아직 별도 구현과 보안 검토가 필요하다.
