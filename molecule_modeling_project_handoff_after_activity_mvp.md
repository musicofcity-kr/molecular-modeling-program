# 분자구조 모델링 프로그램 프로젝트 인계 문서

> 새 채팅창에서 이어서 작업하기 위한 최신 인계 문서입니다.  
> **현재 실제 완료 상태는 `add classroom activity mode MVP`까지**입니다.  
> 이후 대화에서 제안된 VSEPR, 측정 도구, 학생/교사용 분리, 내보내기 기능은 **아직 완료된 것이 아니라 다음 후보 작업**입니다.

---

## 0. 새 채팅창 시작용 요청문

아래 문장을 새 채팅창 첫 메시지로 붙여넣으면 됩니다.

```text
아래 인계 문서를 기준으로 분자구조 모델링 프로그램 프로젝트를 이어서 진행하려고 합니다.
현재 실제 완료 상태는 add classroom activity mode MVP까지입니다.
아직 VSEPR Engine, 결합길이/결합각 측정 도구, 학생용/교사용 모드 분리, 로컬 저장/내보내기는 구현하지 않았습니다.

지금 우선순위는 다음입니다.
1. 3D 구조 제공 가능성 판단 파이프라인 정리
2. 메테인 정사면체 3D 표시 보정
3. 3D 좌표가 있는 경우에만 결합길이/결합각 측정이 가능하도록 기반 정리
4. 그 이후 VSEPR 교육용 분자구조 예측 엔진 MVP 검토

이 문서의 원칙을 유지하면서 다음 Codex 작업 프롬프트를 점검하고, 실제 구현 순서를 안전하게 잡아주세요.
```

---

## 1. 프로젝트 목표

이 프로젝트는 ChemDraw 전체 복제가 아니라, **고등학교 화학 수업용 ChemDraw-like 분자구조 모델링 웹앱**을 만드는 프로젝트입니다.

핵심 목표는 다음과 같습니다.

```text
학생과 교사가 2D 분자구조를 직접 그리고,
RDKit.js로 구조를 검증하여 canonical SMILES, 분자식, 분자량을 확인하고,
3Dmol.js 또는 외부 3D 좌표 데이터를 활용해 입체구조를 관찰하며,
수업 활동 모드에서 예측·검증·관찰·정리를 수행하는 교육용 분자구조 모델링 플랫폼을 제작한다.
```

핵심 역할 분리는 다음과 같습니다.

```text
Ketcher = 2D 구조 입력기
RDKit.js = 화학 구조 검증기
3Dmol.js = 3D 좌표 시각화기
PubChem = 외부 3D 구조 데이터 후보 제공원
VSEPR Engine = 향후 추가할 교육용 분자구조 예측기
```

---

## 2. 현재 실제 완료 상태

사용자가 명시한 최신 상태는 다음과 같습니다.

```text
현재까지 완료:
- add classroom activity mode MVP까지 작업 완료
```

구체적으로 완료된 기능은 다음으로 고정합니다.

```text
1. React + Vite + TypeScript 기반 앱 생성
2. 기본 레이아웃 구성
3. Ketcher 2D 구조 편집기 통합
4. Ketcher에서 SMILES 또는 MOL block 추출
5. RDKit.js 검증 레이어 추가
6. canonicalSmiles, molecularFormula, molecularWeight 표시
7. 검증 실패 시 학생용 메시지와 개발자용 로그 분리
8. 예제 분자 라이브러리 추가
9. 예제 선택 → Ketcher 로드 → RDKit.js 재검증 흐름 구현
10. 3Dmol.js Viewer Shell 추가
11. 정적 3D 예제 데이터 일부 연결
12. PubChem CID 기반 3D 구조 불러오기 프로토타입
13. 수동 PubChem 후보 검색 UI 프로토타입
14. 수업용 활동 모드 MVP
```

---

## 3. 아직 완료되지 않은 작업

다음 항목들은 이전 대화에서 제안되었지만, **현재 완료된 기능으로 간주하지 않습니다.**

```text
아직 미완료:
- 3D 구조 제공 가능성 판단 파이프라인
- 메테인 정사면체 3D 표시 보정
- 3D 입자 표현 스타일 안정화
- 결합길이 측정 도구
- 결합각 측정 도구
- VSEPR 교육용 분자구조 예측 엔진 MVP
- VSEPR 예측 모형 3D 시각화
- 실제/외부 3D 구조와 VSEPR 예측 모형 비교 모드
- 학생용/교사용 모드 분리
- 활동 결과 로컬 저장 및 내보내기
- Firebase, Google Sheets, DB 저장, 로그인
```

---

## 4. 현재 발견된 핵심 문제

### 4.1 Ketcher 2D 표시와 실제 3D 입체구조의 혼동

현재 화면에서 메테인 예제를 선택하면 Ketcher 편집 영역에는 `C` 또는 `CH4`처럼 간략한 2D 구조가 표시됩니다. 이것은 Ketcher가 2D 구조 입력기이기 때문에 자연스러운 동작입니다.

그러나 학생 입장에서는 “입체구조 보기” 또는 Ketcher 내부의 3D 관련 버튼을 누르면 메테인이 정사면체로 보여야 한다고 기대할 수 있습니다.

정확한 처리 원칙은 다음과 같습니다.

```text
Ketcher 영역:
- 2D 구조 입력과 편집만 담당
- 메테인은 C 또는 CH4처럼 간략 표시되어도 정상

3D Viewer 영역:
- 실제 3D 좌표 데이터가 있을 때만 입체구조 표시
- 메테인은 중심 C와 H 4개가 정사면체로 보이도록 명시적 3D 좌표 필요
```

---

### 4.2 메테인 정사면체 구조 미표시 문제

메테인은 VSEPR 관점에서 중심 탄소 주위에 결합 전자쌍 4개가 정사면체 방향으로 배열되는 구조입니다.

현재 문제는 다음입니다.

```text
- 2D 화면에서는 메테인이 CH4 또는 C처럼 보임
- 입체구조 보기 스위치를 눌러도 정사면체 형태로 바뀌지 않음
- 학생이 2D 구조와 실제 입체구조의 차이를 이해하기 어려움
```

해결 방향은 Ketcher를 고치는 것이 아니라, **메테인 예제에 명시적 3D 좌표를 추가하고 3Dmol.js Viewer에서 정사면체로 표시**하는 것입니다.

교육용 메테인 XYZ 예시:

```xyz
5
methane_tetrahedral_educational_coordinates
C 0.000000 0.000000 0.000000
H 0.629118 0.629118 0.629118
H -0.629118 -0.629118 0.629118
H -0.629118 0.629118 -0.629118
H 0.629118 -0.629118 -0.629118
```

주의:

```text
이 좌표는 교육용 시각화 좌표입니다.
정밀 실험값이나 절대 결합길이 기준값으로 사용하지 않습니다.
```

---

### 4.3 3D 좌표 없는 분자에 대한 처리 문제

앞으로 학생들은 다양한 분자를 직접 만들 수 있습니다. 이때 모든 분자를 자동으로 실제 3D 구조로 변환하는 것은 위험합니다.

따라서 앱은 다음 원칙을 따라야 합니다.

```text
학생이 어떤 분자를 그려도:
- 2D 구조 검증은 RDKit.js로 수행
- 3D 입체구조는 좌표 데이터가 있을 때만 표시
- 3D 좌표가 없으면 “3D 좌표 데이터 없음” 안내
- 결합길이/결합각 측정은 비활성화
```

학생용 안내 예:

```text
2D 구조 검증은 완료되었습니다.
3D 입체구조는 좌표 데이터가 있는 경우에만 표시됩니다.
```

---

### 4.4 결합길이·결합각 측정 도구 미구현

현재 보완하고 싶은 기능은 다음입니다.

```text
1. 3D 입자 표현 강화
2. 원자-원자 결합길이 측정
3. 원자-원자-원자 결합각 측정
```

단, 측정 기능은 반드시 다음 조건에서만 활성화해야 합니다.

```text
3D 좌표 있음 → 측정 가능
3D 좌표 없음 → 측정 비활성화
```

절대 하면 안 되는 것:

```text
Ketcher의 2D 좌표를 실제 결합길이/결합각처럼 측정하지 말 것
```

---

### 4.5 VSEPR 이론 반영 아이디어

사용자는 VSEPR 이론을 반영하여 전자쌍 반발에 의한 분자 구조를 표현하는 “화학결합엔진”을 제안했습니다.

단, 이 기능은 “화학결합엔진”보다는 다음 이름이 더 안전합니다.

```text
VSEPR 교육용 분자구조 예측 엔진
또는
Lewis-VSEPR Geometry Engine
```

역할은 다음과 같이 분리합니다.

```text
RDKit.js = 실제 구조 검증, 분자식, 분자량
VSEPR Engine = 중심 원자 기준 전자쌍 배열과 분자 모양 예측
3Dmol.js = 좌표 또는 예측 모형 시각화
PubChem = 외부 3D 좌표 데이터 후보
```

VSEPR Engine은 실제 3D conformer 생성기가 아닙니다.  
전자쌍 반발 이론을 바탕으로 한 **교육용 예측 모델**입니다.

---

## 5. 추천 작업 순서

현재 완료 상태가 `add classroom activity mode MVP`이므로, 다음 순서가 가장 안전합니다.

```text
Phase 9. 3D 구조 제공 가능성 판단 파이프라인 + 메테인 정사면체 보정
↓
Phase 10. 3D 입자 표현 및 결합길이/결합각 측정 도구 MVP
↓
Phase 11. VSEPR 교육용 분자구조 예측 엔진 MVP
↓
Phase 12. VSEPR 예측 모형 3D 시각화
↓
Phase 13. 실제/외부 3D 구조와 VSEPR 예측 모형 비교 모드
↓
Phase 14. 학생용/교사용 모드 분리
↓
Phase 15. 활동 결과 로컬 저장 및 내보내기
```

현재 바로 할 작업은 **Phase 9**입니다.

---

## 6. 다음 Codex 작업 프롬프트: Phase 9

아래 프롬프트를 Codex에 넣어 다음 작업을 시작합니다.

```text
현재 add classroom activity mode MVP까지 완료된 상태입니다.
이제 학생용/교사용 모드 분리나 VSEPR Engine으로 바로 넘어가기 전에, 학생들이 다양한 분자를 그릴 때 2D 구조 검증과 3D 입체구조 표시를 명확히 분리하는 “3D 구조 제공 가능성 판단 파이프라인”을 추가해줘.

현재 상태:
- React + Vite + TypeScript 앱
- Ketcher 2D 구조 편집기 통합 완료
- RDKit.js 검증 완료
- canonicalSmiles, molecularFormula, molecularWeight 표시 가능
- 예제 분자 라이브러리 완료
- 3Dmol.js Viewer Shell 완료
- 정적 3D 예제 데이터 일부 연결 완료
- PubChem CID 기반 3D 구조 불러오기 가능
- 수동 PubChem 후보 검색 가능
- 수업용 활동 모드 MVP 완료

현재 문제:
1. 학생이 다양한 분자를 그렸을 때 모든 분자가 자동으로 3D 입체구조를 갖는 것처럼 오해될 수 있음
2. 메테인처럼 2D에서는 C 또는 CH4로 보이지만 실제로는 정사면체 구조가 필요한 분자의 처리가 불명확함
3. 3D 좌표가 없는 분자에서도 결합길이/결합각 측정이 가능한 것처럼 보일 위험이 있음
4. Ketcher의 2D 표시와 3Dmol.js의 실제 3D 좌표 기반 표시 역할이 UI상 더 명확해야 함

이번 목표:
학생이 어떤 분자를 그리더라도 2D 구조 검증은 안정적으로 제공하고,
3D 구조는 실제 3D 좌표 데이터가 있는 경우에만 표시하도록 정리한다.
또한 메테인에는 명시적 정사면체 3D 좌표를 추가해 3D Viewer에서 올바르게 보이도록 한다.

구현할 것:

1. 3D 구조 상태 타입을 추가한다.

예:
type ThreeDStructureStatus =
  | 'not_checked'
  | 'static_available'
  | 'pubchem_cid_available'
  | 'pubchem_candidate_required'
  | 'no_3d_data'
  | 'loading'
  | 'loaded'
  | 'error';

2. 3D 구조 출처 타입을 추가한다.

예:
type ThreeDStructureSourceType =
  | 'static'
  | 'pubchem'
  | 'vsepr_future'
  | 'computed_future'
  | 'none';

3. 3D 구조 데이터 타입을 정리한다.

예:
interface Molecule3DStructure {
  format: 'xyz' | 'sdf' | 'mol' | 'pdb';
  data: string;
  sourceType: ThreeDStructureSourceType;
  sourceNote: string;
  reliabilityLabel:
    | '교육용 정적 좌표'
    | '외부 데이터베이스 3D 좌표'
    | 'VSEPR 교육용 예측 모형'
    | '계산 예측 구조'
    | '3D 좌표 없음';
}

4. 메테인 예제에 명시적 3D 좌표 데이터를 추가한다.

사용할 수 있는 교육용 XYZ 예시:

5
methane_tetrahedral_educational_coordinates
C 0.000000 0.000000 0.000000
H 0.629118 0.629118 0.629118
H -0.629118 -0.629118 0.629118
H -0.629118 0.629118 -0.629118
H 0.629118 -0.629118 -0.629118

주의:
- 이 좌표는 교육용 시각화 좌표로 사용한다.
- 정밀 실험값으로 표시하지 않는다.
- 측정값은 현재 3D 좌표 기준이라고 안내한다.

5. 메테인 예제 데이터에 다음 정보를 추가한다.

예:
structure3D: {
  format: 'xyz',
  data: methaneXyz,
  sourceType: 'static',
  sourceNote: '교육용 정사면체 메테인 3D 좌표 예제',
  reliabilityLabel: '교육용 정적 좌표'
}

expectedGeometry: {
  shapeKo: '정사면체',
  centralAtom: 'C',
  expectedBondAngleDeg: 109.5,
  note: '메테인은 중심 탄소 주위에 수소 4개가 정사면체 방향으로 배열된다.'
}

6. 3D 구조 탐색 순서를 명확히 구현한다.

순서:
1) 선택된 예제 분자에 static 3D 좌표가 있으면 우선 사용
2) 예제 분자에 pubchemCid가 있으면 PubChem 3D 불러오기 버튼 제공
3) 사용자가 직접 그린 구조는 RDKit 검증 성공 후 PubChem 후보 검색 버튼 제공
4) 후보가 없거나 실패하면 3D 좌표 없음 상태 표시

7. 3D 좌표가 없을 때는 다음을 유지한다.
- 2D 구조 표시
- RDKit.js 분자식/분자량 표시
- 학생용 안내 문구 표시
- 결합길이/결합각 측정 버튼 비활성화

학생용 안내 예:
“2D 구조 검증은 완료되었습니다. 3D 입체구조는 좌표 데이터가 있는 경우에만 표시됩니다.”

8. 3D 좌표가 있을 때만 다음 기능을 활성화할 수 있도록 기준을 만든다.
- ball-and-stick 보기
- stick 보기
- space-filling 보기
- 결합길이 측정
- 결합각 측정

이번 단계에서 결합길이/결합각 측정 자체를 완성하지 않아도 된다.
다만 측정 기능은 반드시 3D 좌표가 있을 때만 활성화되도록 상태 기반을 설계한다.

9. Ketcher와 3D Viewer의 역할을 UI에서 분리한다.

학생용 안내 예:
“2D 편집기에서는 분자가 간략 구조로 보일 수 있습니다. 실제 입체구조는 3D Viewer에서 확인하세요.”

10. 구조 정보 패널의 SMILES 표시 버그를 점검한다.

필수 확인:
- 메테인의 SMILES는 C로 표시되어야 함
- 물의 SMILES는 O로 표시되어야 함
- canonicalSmiles 또는 SMILES가 0으로 표시되는 문제가 있으면 수정
- RDKit 검증 결과와 Ketcher export 값이 잘못 매핑되지 않았는지 확인

11. 문서 업데이트:
- docs/TDD_DRAFT.md
- docs/ROADMAP.md
- docs/THREE_D_DATA_POLICY.md

문서에 기록할 내용:
- 모든 분자가 자동으로 3D 구조를 갖는 것은 아님
- 3D 좌표가 있는 경우에만 3D Viewer와 측정 기능을 제공함
- Ketcher는 2D 구조 편집기
- RDKit.js는 분자식/분자량 검증기
- 3Dmol.js는 3D 좌표 시각화기
- 메테인 정사면체는 명시적 3D 좌표 기반으로 표시함
- 측정값은 현재 3D 좌표 기준이며 정밀 실험값으로 사용하지 않음

주의:
- 모든 SMILES를 자동으로 3D 구조로 변환하지 말 것
- Ketcher의 2D mol block을 3D 구조라고 표시하지 말 것
- Ketcher 내부의 3D 아이콘을 실제 3D 생성 기능처럼 안내하지 말 것
- PubChem 후보가 1개여도 자동 확정하지 말 것
- RDKit.js 분자식/분자량을 PubChem 값으로 덮어쓰지 말 것
- RDKit 3D conformer 생성 금지
- Open Babel 백엔드 구현 금지
- 에너지 최소화 금지
- VSEPR Engine은 이번 단계에서 구현하지 말 것
- UI 대규모 리디자인 금지
- 기존 수업용 활동 모드 기능을 깨뜨리지 말 것

완료 후 보고할 것:
- 변경 파일 목록
- 추가한 3D 상태 타입
- 메테인 3D 좌표 추가 위치
- 3D 구조 탐색 순서
- 3D 좌표가 없는 분자 처리 방식
- 측정 기능 활성화/비활성화 기준
- 메테인이 3D Viewer에서 정사면체로 표시되는지
- SMILES가 C, O 등으로 정상 표시되는지
- npm run build 결과
- npx tsc --noEmit 결과
```

---

## 7. Phase 9 작업 전 명령어

```bash
cd C:\all\molecule-modeling-workbench
npm run build
npx tsc --noEmit
git status
```

현재 활동 모드 MVP가 정상이라면 먼저 커밋합니다.

```bash
git add .
git commit -m "feat: add classroom activity mode MVP"
```

그다음 새 브랜치를 권장합니다.

```bash
git checkout -b feature/3d-structure-availability-pipeline
```

---

## 8. Phase 9 완료 기준

```text
메테인 예제 선택
→ Ketcher에는 C 또는 CH4처럼 간략 표시
→ 구조 정보에는 CH4 표시
→ SMILES는 C 표시
→ 3D Viewer에는 C 1개 + H 4개 정사면체 구조 표시
→ 3D 출처: 교육용 정적 좌표 표시
```

직접 임의 분자를 그렸을 때:

```text
RDKit 검증 성공
→ 분자식/분자량 표시
→ 3D 좌표가 없으면 “3D 좌표 데이터 없음” 안내
→ 결합길이/결합각 측정 비활성화
→ PubChem 후보 검색 버튼은 수동으로만 실행
```

---

## 9. Phase 10 후보: 3D 측정 도구 MVP

Phase 9 완료 후 다음 작업은 다음입니다.

```text
Phase 10: 3D 입자 표현 및 결합길이/결합각 측정 도구 MVP
```

핵심 기능:

```text
- ball-and-stick / stick / space-filling 보기 전환
- 원자 라벨 on/off
- reset view / zoom to fit
- 원자 2개 선택 → 결합길이 측정
- 원자 3개 선택 → 결합각 측정
- 측정 결과 패널
- 3D 좌표가 없으면 측정 비활성화
```

원칙:

```text
측정값은 현재 로드된 3D 좌표 데이터 기준입니다.
정밀 실험값이나 절대 기준값으로 사용하지 않습니다.
```

---

## 10. Phase 11 후보: VSEPR 교육용 분자구조 예측 엔진 MVP

Phase 10 이후 다음 작업 후보입니다.

```text
Phase 11: VSEPR 교육용 분자구조 예측 엔진 MVP
```

목표:

```text
학생이 그린 2D 구조를 바탕으로 중심 원자 주변 전자쌍 배열과 분자 구조를 예측한다.
```

초기 지원 예:

```text
AX2 → 선형
AX3 → 삼각평면형
AX2E → 굽은형
AX4 → 정사면체
AX3E → 삼각뿔형
AX2E2 → 굽은형
```

주의:

```text
VSEPR Engine은 실제 3D conformer 생성기가 아니다.
VSEPR 결과는 전자쌍 반발 이론에 따른 교육용 예측이다.
실제 실험 구조 또는 계산화학 최적화 구조처럼 표시하지 않는다.
```

---

## 11. 개발 원칙

프로젝트 전체에서 반드시 유지할 원칙입니다.

```text
1. 한 번에 여러 라이브러리를 붙이지 않는다.
2. Ketcher, RDKit.js, 3Dmol.js, PubChem, VSEPR Engine의 역할을 섞지 않는다.
3. 화학값은 AI가 생성한 값을 쓰지 않고 RDKit.js 검증 결과를 기준으로 한다.
4. PubChem 값으로 RDKit 검증값을 덮어쓰지 않는다.
5. 2D 구조를 3D 구조처럼 표시하지 않는다.
6. SMILES만으로 실제 3D 좌표를 자동 생성했다고 주장하지 않는다.
7. 3D 좌표가 있는 경우에만 결합길이/결합각 측정 기능을 활성화한다.
8. VSEPR 모형은 실제 3D 구조가 아니라 교육용 예측 모형으로 표시한다.
9. 기능 추가 전후 반드시 npm run build와 npx tsc --noEmit을 실행한다.
10. 주요 단계마다 Git 커밋을 만든다.
```

---

## 12. 추천 커밋 흐름

현재 이후 커밋 흐름은 다음처럼 잡습니다.

```bash
git commit -m "feat: add classroom activity mode MVP"
git commit -m "feat: add 3d structure availability pipeline"
git commit -m "fix: show methane tetrahedral geometry using static 3d coordinates"
git commit -m "feat: add 3d geometry measurement tools"
git commit -m "feat: add VSEPR educational geometry engine MVP"
git commit -m "feat: add VSEPR 3D educational model viewer"
git commit -m "feat: add VSEPR vs real 3D comparison mode"
git commit -m "feat: separate student and teacher modes"
git commit -m "feat: add local activity save and export MVP"
```

---

## 13. 요약

현재 프로젝트는 단순 분자 그리기 앱에서 다음 단계로 넘어가는 지점입니다.

```text
현재 완료:
수업용 활동 모드 MVP

바로 다음:
3D 구조 제공 가능성 판단 파이프라인 + 메테인 정사면체 보정

그 다음:
3D 입자 표현 및 결합길이/결합각 측정 도구

그 다음:
VSEPR 교육용 분자구조 예측 엔진
```

핵심 방향은 다음입니다.

```text
모든 분자를 자동으로 실제 3D 구조로 바꾸는 앱이 아니라,
2D 구조 검증은 안정적으로 수행하고,
3D 좌표가 확인된 분자는 입체구조로 보여주며,
VSEPR 이론은 교육용 예측 모형으로 분리해 제공하는 수업용 분자구조 모델링 도구를 만든다.
```
