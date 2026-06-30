import type {
  Molecule3DCoordinateFormat,
  Molecule3DSourceType,
} from '../types/molecule';

export type ExampleMoleculeCategory = '기본 분자' | '유기 기초' | '생활 속 분자';

export type ExampleMolecule3DStructure = {
  format: Molecule3DCoordinateFormat;
  data: string;
  sourceType: Molecule3DSourceType;
  sourceNote: string;
  sourceUrl?: string;
};

export type ExampleMoleculeExternal3DSource = 'pubchem' | 'static' | 'none';

export type ExampleMolecule = {
  id: string;
  nameKo: string;
  nameEn: string;
  smiles: string;
  expectedFormula: string;
  teachingUse: string;
  category: ExampleMoleculeCategory;
  pubchemCid?: number;
  pubchemName?: string;
  external3DSource?: ExampleMoleculeExternal3DSource;
  structure3D?: ExampleMolecule3DStructure;
};

const STATIC_3D_SOURCE_NOTE =
  '앱 내장 교육용 정적 3D 좌표입니다. 실험값, 에너지 최소화 결과, 결합각 계산용 데이터가 아닙니다.';

export const exampleMolecules: ExampleMolecule[] = [
  {
    id: 'water',
    nameKo: '물',
    nameEn: 'Water',
    smiles: 'O',
    expectedFormula: 'H2O',
    teachingUse: '공유 결합과 굽은형 분자 구조를 설명할 때 사용합니다.',
    category: '기본 분자',
    pubchemCid: 962,
    pubchemName: 'Water',
    external3DSource: 'pubchem',
    structure3D: {
      format: 'sdf',
      sourceType: 'static-example',
      sourceNote: STATIC_3D_SOURCE_NOTE,
      data: `water static 3D example
  Workbench  063026

  3  2  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 O   0  0  0  0  0  0  0  0  0  0  0  0
    0.9572    0.0000    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.2390    0.9270    0.0000 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
M  END
$$$$`,
    },
  },
  {
    id: 'methane',
    nameKo: '메테인',
    nameEn: 'Methane',
    smiles: 'C',
    expectedFormula: 'CH4',
    teachingUse: '탄소의 네 결합과 기본 유기 분자 도입에 사용합니다.',
    category: '기본 분자',
    pubchemCid: 297,
    pubchemName: 'Methane',
    external3DSource: 'pubchem',
    structure3D: {
      format: 'sdf',
      sourceType: 'static-example',
      sourceNote: STATIC_3D_SOURCE_NOTE,
      data: `methane static 3D example
  Workbench  063026

  5  4  0  0  0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.6291    0.6291    0.6291 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6291   -0.6291    0.6291 H   0  0  0  0  0  0  0  0  0  0  0  0
   -0.6291    0.6291   -0.6291 H   0  0  0  0  0  0  0  0  0  0  0  0
    0.6291   -0.6291   -0.6291 H   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0
  1  3  1  0
  1  4  1  0
  1  5  1  0
M  END
$$$$`,
    },
  },
  {
    id: 'ammonia',
    nameKo: '암모니아',
    nameEn: 'Ammonia',
    smiles: 'N',
    expectedFormula: 'H3N',
    teachingUse: '비공유 전자쌍과 삼각뿔형 분자 구조를 설명할 때 사용합니다.',
    category: '기본 분자',
    external3DSource: 'none',
  },
  {
    id: 'carbon-dioxide',
    nameKo: '이산화탄소',
    nameEn: 'Carbon dioxide',
    smiles: 'O=C=O',
    expectedFormula: 'CO2',
    teachingUse: '이중 결합과 직선형 분자 구조를 비교할 때 사용합니다.',
    category: '기본 분자',
    external3DSource: 'none',
  },
  {
    id: 'ethanol',
    nameKo: '에탄올',
    nameEn: 'Ethanol',
    smiles: 'CCO',
    expectedFormula: 'C2H6O',
    teachingUse: '하이드록시기와 생활 속 유기 분자를 연결할 때 사용합니다.',
    category: '유기 기초',
    pubchemCid: 702,
    pubchemName: 'Ethanol',
    external3DSource: 'pubchem',
  },
  {
    id: 'acetic-acid',
    nameKo: '아세트산',
    nameEn: 'Acetic acid',
    smiles: 'CC(=O)O',
    expectedFormula: 'C2H4O2',
    teachingUse: '카복실기와 산성 물질 예시를 설명할 때 사용합니다.',
    category: '유기 기초',
    external3DSource: 'none',
  },
  {
    id: 'benzene',
    nameKo: '벤젠',
    nameEn: 'Benzene',
    smiles: 'c1ccccc1',
    expectedFormula: 'C6H6',
    teachingUse: '방향족 고리와 단일/이중 결합 표현의 한계를 다룰 때 사용합니다.',
    category: '유기 기초',
    pubchemCid: 241,
    pubchemName: 'Benzene',
    external3DSource: 'pubchem',
  },
  {
    id: 'glucose',
    nameKo: '포도당',
    nameEn: 'Glucose',
    smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O',
    expectedFormula: 'C6H12O6',
    teachingUse: '탄수화물과 생명 현상 속 분자 예시로 사용합니다.',
    category: '생활 속 분자',
    external3DSource: 'none',
  },
  {
    id: 'aspirin',
    nameKo: '아스피린',
    nameEn: 'Aspirin',
    smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
    expectedFormula: 'C9H8O4',
    teachingUse: '생활 속 의약품 분자와 작용기 찾기 활동에 사용합니다.',
    category: '생활 속 분자',
    external3DSource: 'none',
  },
];

export function buildExpectedFormulaWarning(
  example: Pick<ExampleMolecule, 'nameKo' | 'expectedFormula'>,
  rdkitFormula: string,
): string | null {
  if (example.expectedFormula === rdkitFormula) {
    return null;
  }

  return `${example.nameKo} 예제의 expectedFormula(${example.expectedFormula})와 RDKit 검증 결과(${rdkitFormula})가 다릅니다. 학생용 패널에는 RDKit 결과를 표시합니다.`;
}
