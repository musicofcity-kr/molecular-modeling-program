# Classroom MVP Release Checklist

- 갱신일: 2026-07-27
- 대상: `apps/workbench`
- 상태: Firebase 수업방·학생 제출·교사 피드백을 포함하는 브라우저 우선 MVP

## 포함 범위

- React + Vite + TypeScript
- Ketcher 간편/고급 2D 구조 편집과 구조 보존 복구
- RDKit.js fail-closed 검증, canonical SMILES, 분자식, 평균 분자량
- VSEPR 근거표와 실제/외부 3D·교육용 예상 모형 구분
- PubChem 후보 및 반환 SDF의 RDKit 구조 일치 재검증
- 학생 5단계 흐름과 390px 모바일 하단 탐색
- Firebase Anonymous Auth 수업 입장과 trusted membership endpoint
- 소유권·피드백 잠금이 적용된 학생 제출
- 교사 custom claim 기반 수업방·제출 조회·피드백 반환
- Firestore Security Rules emulator 회귀
- 명시적 활동 결과 로컬 저장·내보내기

## 제외 범위

- 전체 ChemDraw 복제
- 자동 채점·성취도 판정
- RDKit 3D conformer 생성과 에너지 최소화
- VSEPR 벡터를 실험·계산화학 좌표로 취급
- PubChem 값을 RDKit 검증값의 대체값으로 사용
- 학생 제출의 origin-wide `localStorage` fallback
- 학생용 Firestore self-service 삭제 UI
- production 운영 보유 기간을 코드가 자동 집행하는 TTL

## 필수 릴리즈 게이트

`apps/workbench`에서 실행합니다.

```powershell
npm ci
npm run typecheck
npm test
npm run test:firestore-rules
npm run build
npm run test:e2e
```

- Critical 0건, High 0건
- QA score 95/100 이상
- `REVIEWER_FEEDBACK.md`의 `[OPEN]` 항목 0건
- `git diff --check` 통과
- baseline/final 스크린샷과 `docs/QA_TEST_REPORT.md` 최신화
- 추적 파일 비밀 패턴 및 `.env.local` gitignore 확인
- 실제 Firebase/Vercel 운영을 켤 때는 mock E2E와 별도로 배포 endpoint,
  teacher claim, Firestore 권한·보유/삭제 절차 확인

알려진 비차단 build 경고는 QA 보고서에 기록합니다.

- 3Dmol.js의 `eval` 경고
- Ketcher/3Dmol/RDKit 대형 chunk 경고
- 의존성 advisory는 실제 도달 가능성과 안전한 업데이트 영향을 별도 검토

## 학생 핵심 QA

### 정상 입장과 H2O

1. 윤리 가이드 확인 후 학생 수업방에 입장합니다.
2. 물 예제를 불러오고 `2D 구조 분석하기`를 실행합니다.
3. RDKit 분자식 `H2O`, 중심 원자 O, 전체 전자 영역 4, AX2E2·굽은형을
   확인합니다.
4. 실제/참고 3D와 VSEPR 예상 모형의 출처·한계를 구분해 표시하는지 확인합니다.
5. 3D 단계 방문 후 판단과 근거를 작성하고 trusted 서버 제출 완료 영수증을
   확인합니다.

### CH4·NH3·H2O 비교

- CH4: AX4·정사면체
- NH3: AX3E·삼각뿔형
- H2O: AX2E2·굽은형
- 구조 변경 때 이전 검증·3D 방문·제출 완료 상태가 즉시 무효화되는지 확인

### 오류와 화학 안전

- 빈 구조, 잘못된 원자가, 분리 조각
- charged/isotope/radical/dummy/query atom
- query bond와 V2000 `M SUB`/`M UNS`/`M RBC`
- MOL/SMILES 불일치
- PubChem formula-only, 구조 이성질체, 입체화학 불일치, 가짜/query SDF
- 각 경우 계산·3D 결과를 표시하지 않고 학생용 복구 안내를 제공

### 공유 기기 개인정보

1. 학생 A가 미제출 답변을 작성합니다.
2. 교사 역할 전환·로그아웃 뒤 학생 B가 입장합니다.
3. A의 답변·구조·제출 캐시·완료 영수증이 B 화면에 나타나지 않아야 합니다.
4. `molecule-workbench-activity-submissions` localStorage 키가 없고 서버 실패
   재시도 자료는 현재 화면 메모리에만 남는지 확인합니다.

## 모바일 QA

- Pixel 5 조건 390×844, touch enabled
- 하단 5탭과 콘텐츠·footer 겹침 없음
- 모든 핵심 조작 44×44px 이상
- Ketcher canvas touch와 3D touchStart/move/end 처리
- 가로 844×390 overflow 없음
- 제출 완료까지 실제 touch 흐름 통과
- 실제 OS 가상키보드와 물리 기기 확인은 운영 전 수동 확인 항목

## 교사 QA

1. teacher custom claim이 없는 로그인은 서버 기능을 열지 않습니다.
2. 승인 교사는 담당 수업코드 범위의 제출만 조회합니다.
3. 로그아웃·token·수업코드·request id 변경 후 이전 응답을 반영하지 않습니다.
4. AI 초안은 서버에서 제출을 읽고, 교사 검토 후에만 반환합니다.
5. 원격 피드백 저장 실패 시 성공 상태를 로컬에 먼저 반영하지 않습니다.
6. 다른 학생의 submission id 덮어쓰기와 피드백 시작 후 snapshot 변경을
   trusted endpoint와 Firestore Rules가 차단합니다.
