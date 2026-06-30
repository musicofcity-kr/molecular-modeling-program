import type { ActivityTemplate } from '../types/activity';

const predictionQuestions = [
  {
    id: 'predictedFormula',
    label: '예상 분자식',
    placeholder: '예: H2O',
  },
  {
    id: 'predictedMolecularWeight',
    label: '예상 분자량',
    placeholder: '예: 18.015',
  },
  {
    id: 'drawingReason',
    label: '구조를 그렇게 그린 이유',
    placeholder: '결합 수, 원자 배치, 작용기 등을 기준으로 적어 보세요.',
  },
  {
    id: 'predictedCentralAtom',
    label: '중심 원자는 무엇인가요?',
    placeholder: '예: O, C, N',
  },
  {
    id: 'predictedBondingDomains',
    label: '중심 원자 주변 결합 전자쌍은 몇 개인가요?',
    placeholder: '예: 2',
  },
  {
    id: 'predictedLonePairs',
    label: '중심 원자 주변 비공유 전자쌍은 몇 개인가요?',
    placeholder: '예: 2',
  },
  {
    id: 'predictedVseprShape',
    label: 'VSEPR 이론에 따른 분자 구조는 무엇인가요?',
    placeholder: '예: 굽은형, 정사면체, 삼각뿔형',
  },
] satisfies ActivityTemplate['predictionQuestions'];

const reflectionQuestions = [
  {
    id: 'afterValidationReflection',
    label: '검증 후 알게 된 점',
    placeholder: 'RDKit.js 검증 결과와 내 예상이 같거나 달랐던 이유를 적어 보세요.',
  },
  {
    id: 'vseprReflection',
    label: '2D 구조와 VSEPR 예측 구조는 어떻게 다른가요?',
    placeholder:
      '2D 구조식은 연결 관계를, VSEPR 예측은 중심 원자 주변의 입체적인 배열을 설명한다는 점을 비교해 보세요.',
  },
  {
    id: 'vseprModelElectronDomainObservation',
    label: 'VSEPR 모형에서 중심 원자 주위 전자쌍은 어떻게 배치되어 있나요?',
    placeholder: '결합 전자쌍과 비공유 전자쌍의 방향을 구분해 관찰해 보세요.',
  },
  {
    id: 'vseprModelLonePairEffect',
    label: '비공유 전자쌍이 분자 모양에 어떤 영향을 주나요?',
    placeholder:
      '비공유 전자쌍이 있을 때 결합 원자들의 배치가 어떻게 달라지는지 적어 보세요.',
  },
  {
    id: 'vseprModelVsPubChemObservation',
    label:
      '실제 3D 구조 또는 PubChem 구조와 VSEPR 예측 모형이 같거나 다르게 보이는 부분은 무엇인가요?',
    placeholder:
      'VSEPR 모형은 이상화된 예측 모형이고 PubChem 구조는 외부 좌표 데이터라는 점을 비교해 보세요.',
  },
] satisfies ActivityTemplate['reflectionQuestions'];

export const activityTemplates: ActivityTemplate[] = [
  {
    id: 'draw-water',
    title: '물 분자 구조 그리기',
    targetMoleculeName: '물',
    targetSmiles: 'O',
    learningGoal: '물 분자의 원자 구성과 공유 결합 수를 2D 구조로 표현한다.',
    prompt: '산소 원자와 수소 원자의 결합 관계를 떠올리며 물 분자를 그려 보세요.',
    predictionQuestions,
    reflectionQuestions,
    coreConcepts: ['공유 결합', '비공유 전자쌍', 'VSEPR 굽은형 구조'],
    teacherNotes: [
      '산소 중심 원자 주위 결합 전자쌍 2개와 비공유 전자쌍 2개를 구분하게 합니다.',
      '2D 구조식은 원자 연결을 보여 주고, VSEPR 모형은 전자쌍 배치를 설명한다는 점을 분리합니다.',
    ],
    misconceptionChecks: [
      'H-O-H를 직선형으로 이해하는 오류',
      '비공유 전자쌍이 분자 모양에 영향을 주지 않는다고 보는 오류',
    ],
    requiresVsepr: true,
    expectedVsepr: {
      axeNotation: 'AX2E2',
      molecularShapeKo: '굽은형',
      centralAtom: 'O',
      lonePairCount: 2,
    },
    recommendedExampleId: 'water',
  },
  {
    id: 'draw-methane',
    title: '메테인 분자 구조 그리기',
    targetMoleculeName: '메테인',
    targetSmiles: 'C',
    learningGoal: '탄소 중심 원자 주위 네 결합 전자쌍의 정사면체 배열을 설명한다.',
    prompt: '탄소 원자가 수소 원자 4개와 결합하는 구조를 그려 보세요.',
    predictionQuestions,
    reflectionQuestions,
    coreConcepts: ['탄소의 4가 결합', '결합 전자쌍 4개', '정사면체 배열'],
    teacherNotes: [
      '중심 C 주위 4개 결합 전자쌍이 가능한 한 멀어지는 방향으로 배열됨을 강조합니다.',
      '종이에 그린 십자 모양과 VSEPR 정사면체 모형을 비교하게 합니다.',
    ],
    misconceptionChecks: [
      '메테인을 평면 십자형으로 이해하는 오류',
      '4개 결합이 모두 같은 평면 위에 있다고 보는 오류',
    ],
    requiresVsepr: true,
    expectedVsepr: {
      axeNotation: 'AX4',
      molecularShapeKo: '정사면체',
      centralAtom: 'C',
      lonePairCount: 0,
    },
    recommendedExampleId: 'methane',
  },
  {
    id: 'draw-ammonia',
    title: '암모니아 분자 구조 그리기',
    targetMoleculeName: '암모니아',
    targetSmiles: 'N',
    learningGoal: '질소 중심 원자 주위 비공유 전자쌍 1쌍이 삼각뿔형 구조를 만든다는 점을 설명한다.',
    prompt: '질소 원자와 수소 원자 3개의 결합 관계를 그린 뒤 비공유 전자쌍의 역할을 예측해 보세요.',
    predictionQuestions,
    reflectionQuestions,
    coreConcepts: ['비공유 전자쌍 1쌍', '삼각뿔형', '전자쌍 배열과 분자 구조의 차이'],
    teacherNotes: [
      '질소 중심 원자 주위 전자쌍 배열은 정사면체 방향이지만, 원자 위치만 보면 삼각뿔형임을 구분합니다.',
      '비공유 전자쌍을 실제 입자처럼 설명하지 않고 방향 이해용 모델로 다룹니다.',
    ],
    misconceptionChecks: [
      '암모니아를 삼각평면형으로 이해하는 오류',
      '비공유 전자쌍을 분자 구조 이름에 포함된 원자처럼 보는 오류',
    ],
    requiresVsepr: true,
    expectedVsepr: {
      axeNotation: 'AX3E',
      molecularShapeKo: '삼각뿔형',
      centralAtom: 'N',
      lonePairCount: 1,
    },
    recommendedExampleId: 'ammonia',
  },
  {
    id: 'draw-ethanol',
    title: '에탄올 분자 구조 그리기',
    targetMoleculeName: '에탄올',
    targetSmiles: 'CCO',
    learningGoal: '탄소 골격과 하이드록시기를 구분하여 에탄올 구조를 표현한다.',
    prompt: '탄소 2개가 연결된 골격 끝에 하이드록시기가 붙은 구조를 그려 보세요.',
    predictionQuestions,
    reflectionQuestions,
    coreConcepts: ['탄소 골격', '하이드록시기', '중심 원자별 국소 VSEPR 분석'],
    teacherNotes: [
      '에탄올 전체를 하나의 VSEPR 구조로 단정하지 않고 C1, C2, O3 같은 중심 원자별 국소 구조로 분석하게 합니다.',
      '외부 3D 구조는 전체 좌표 시각화이고 VSEPR은 선택한 중심 원자 주변 예측임을 구분합니다.',
    ],
    misconceptionChecks: [
      '에탄올 전체 분자를 하나의 AXE 표기로 설명하려는 오류',
      '하이드록시기의 산소 주변 구조와 탄소 주변 구조를 혼동하는 오류',
    ],
    requiresVsepr: true,
    expectedVsepr: {
      axeNotation: 'center-specific',
      molecularShapeKo: '중심 원자별 국소 분석',
      centralAtom: 'C 또는 O',
    },
    recommendedExampleId: 'ethanol',
  },
  {
    id: 'draw-benzene',
    title: '벤젠 분자 구조 그리기',
    targetMoleculeName: '벤젠',
    targetSmiles: 'c1ccccc1',
    learningGoal: '방향족 고리 구조를 2D 편집기에서 표현하고 검증 결과를 확인한다.',
    prompt: '탄소 6개가 고리를 이루는 방향족 구조를 그려 보세요.',
    predictionQuestions,
    reflectionQuestions,
    coreConcepts: ['방향족 고리', '평면 고리 구조', '공명 표현의 한계'],
    teacherNotes: [
      'Ketcher/RDKit 검증은 방향족 구조 표현을 확인하지만, VSEPR MVP는 방향족 결합을 단순화해 설명한다는 점을 안내합니다.',
      '벤젠의 실제 평면성 설명은 VSEPR 단일 중심 모형만으로 충분하지 않음을 강조합니다.',
    ],
    misconceptionChecks: [
      '방향족 고리를 단일/이중 결합이 고정된 일반 고리로만 이해하는 오류',
      'VSEPR 단일 중심 분석을 벤젠 전체 고리 구조 설명으로 과도하게 확장하는 오류',
    ],
    requiresVsepr: true,
    expectedVsepr: {
      axeNotation: 'local aromatic centers',
      molecularShapeKo: '중심 원자별 국소 분석',
      centralAtom: '각 C',
    },
    recommendedExampleId: 'benzene',
  },
];
