export type ExampleMolecule = {
  id: string;
  nameKo: string;
  nameEn: string;
  smiles: string;
  formula: string;
  teachingUse: string;
};

export const exampleMolecules: ExampleMolecule[] = [
  {
    id: 'water',
    nameKo: '물',
    nameEn: 'Water',
    smiles: 'O',
    formula: 'H2O',
    teachingUse: '공유 결합과 굽은형 분자 구조를 설명할 때 사용합니다.',
  },
  {
    id: 'methane',
    nameKo: '메테인',
    nameEn: 'Methane',
    smiles: 'C',
    formula: 'CH4',
    teachingUse: '탄소의 네 결합과 기본 유기 분자 도입에 사용합니다.',
  },
  {
    id: 'ammonia',
    nameKo: '암모니아',
    nameEn: 'Ammonia',
    smiles: 'N',
    formula: 'H3N',
    teachingUse: '비공유 전자쌍과 삼각뿔형 분자 구조를 설명할 때 사용합니다.',
  },
  {
    id: 'carbon-dioxide',
    nameKo: '이산화탄소',
    nameEn: 'Carbon dioxide',
    smiles: 'O=C=O',
    formula: 'CO2',
    teachingUse: '이중 결합과 직선형 분자 구조를 비교할 때 사용합니다.',
  },
  {
    id: 'ethanol',
    nameKo: '에탄올',
    nameEn: 'Ethanol',
    smiles: 'CCO',
    formula: 'C2H6O',
    teachingUse: '하이드록시기와 생활 속 유기 분자를 연결할 때 사용합니다.',
  },
  {
    id: 'acetic-acid',
    nameKo: '아세트산',
    nameEn: 'Acetic acid',
    smiles: 'CC(=O)O',
    formula: 'C2H4O2',
    teachingUse: '카복실기와 산성 물질 예시를 설명할 때 사용합니다.',
  },
  {
    id: 'benzene',
    nameKo: '벤젠',
    nameEn: 'Benzene',
    smiles: 'c1ccccc1',
    formula: 'C6H6',
    teachingUse: '방향족 고리와 단일/이중 결합 표현의 한계를 다룰 때 사용합니다.',
  },
  {
    id: 'glucose',
    nameKo: '포도당',
    nameEn: 'Glucose',
    smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O',
    formula: 'C6H12O6',
    teachingUse: '탄수화물과 생명 현상 속 분자 예시로 사용합니다.',
  },
  {
    id: 'aspirin',
    nameKo: '아스피린',
    nameEn: 'Aspirin',
    smiles: 'CC(=O)Oc1ccccc1C(=O)O',
    formula: 'C9H8O4',
    teachingUse: '생활 속 의약품 분자와 작용기 찾기 활동에 사용합니다.',
  },
];
