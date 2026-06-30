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
    recommendedExampleId: 'water',
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
    recommendedExampleId: 'benzene',
  },
];
