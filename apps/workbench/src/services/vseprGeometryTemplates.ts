import type { VseprGeometryTemplate, VseprVector } from '../types/vsepr';

const linear = [
  vector(-1, 0, 0, 'bond', 'X1'),
  vector(1, 0, 0, 'bond', 'X2'),
];

const trigonalPlanar = [
  vector(1, 0, 0, 'bond', 'X1'),
  vector(-0.5, Math.sqrt(3) / 2, 0, 'bond', 'X2'),
  vector(-0.5, -Math.sqrt(3) / 2, 0, 'bond', 'X3'),
];

const tetrahedral = [
  vector(1, 1, 1, 'bond', 'X1'),
  vector(-1, -1, 1, 'bond', 'X2'),
  vector(-1, 1, -1, 'bond', 'X3'),
  vector(1, -1, -1, 'bond', 'X4'),
];

const trigonalBipyramidal = [
  vector(0, 0, 1, 'bond', 'X axial 1'),
  vector(0, 0, -1, 'bond', 'X axial 2'),
  vector(1, 0, 0, 'bond', 'X eq 1'),
  vector(-0.5, Math.sqrt(3) / 2, 0, 'bond', 'X eq 2'),
  vector(-0.5, -Math.sqrt(3) / 2, 0, 'bond', 'X eq 3'),
];

const octahedral = [
  vector(1, 0, 0, 'bond', 'X1'),
  vector(-1, 0, 0, 'bond', 'X2'),
  vector(0, 1, 0, 'bond', 'X3'),
  vector(0, -1, 0, 'bond', 'X4'),
  vector(0, 0, 1, 'bond', 'X5'),
  vector(0, 0, -1, 'bond', 'X6'),
];

export const VSEPR_GEOMETRY_TEMPLATES: Record<string, VseprGeometryTemplate> = {
  AX2: template('AX2', '선형', '선형', ['180°'], linear),
  AX3: template('AX3', '삼각 평면', '삼각 평면', ['120°'], trigonalPlanar),
  AX2E: template('AX2E', '삼각 평면', '굽은형', ['<120°'], [
    trigonalPlanar[0],
    trigonalPlanar[1],
    { ...trigonalPlanar[2], kind: 'lonePair', label: 'E1' },
  ]),
  AX4: template('AX4', '정사면체', '정사면체', ['109.5°'], tetrahedral),
  AX3E: template('AX3E', '정사면체', '삼각뿔형', ['<109.5°'], [
    tetrahedral[0],
    tetrahedral[1],
    tetrahedral[2],
    { ...tetrahedral[3], kind: 'lonePair', label: 'E1' },
  ]),
  AX2E2: template('AX2E2', '정사면체', '굽은형', ['<109.5°'], [
    tetrahedral[0],
    tetrahedral[1],
    { ...tetrahedral[2], kind: 'lonePair', label: 'E1' },
    { ...tetrahedral[3], kind: 'lonePair', label: 'E2' },
  ]),
  AX5: template(
    'AX5',
    '삼각쌍뿔',
    '삼각쌍뿔',
    ['90°', '120°', '180°'],
    trigonalBipyramidal,
  ),
  AX4E: template('AX4E', '삼각쌍뿔', '시소형', ['<90°', '<120°', '180°'], [
    trigonalBipyramidal[0],
    trigonalBipyramidal[1],
    trigonalBipyramidal[2],
    trigonalBipyramidal[3],
    { ...trigonalBipyramidal[4], kind: 'lonePair', label: 'E1' },
  ]),
  AX3E2: template('AX3E2', '삼각쌍뿔', 'T자형', ['~90°', '180°'], [
    trigonalBipyramidal[0],
    trigonalBipyramidal[1],
    trigonalBipyramidal[2],
    { ...trigonalBipyramidal[3], kind: 'lonePair', label: 'E1' },
    { ...trigonalBipyramidal[4], kind: 'lonePair', label: 'E2' },
  ]),
  AX2E3: template('AX2E3', '삼각쌍뿔', '선형', ['180°'], [
    trigonalBipyramidal[0],
    trigonalBipyramidal[1],
    { ...trigonalBipyramidal[2], kind: 'lonePair', label: 'E1' },
    { ...trigonalBipyramidal[3], kind: 'lonePair', label: 'E2' },
    { ...trigonalBipyramidal[4], kind: 'lonePair', label: 'E3' },
  ]),
  AX6: template('AX6', '팔면체', '팔면체', ['90°', '180°'], octahedral),
  AX5E: template('AX5E', '팔면체', '사각뿔형', ['<90°', '180°'], [
    octahedral[0],
    octahedral[1],
    octahedral[2],
    octahedral[3],
    octahedral[4],
    { ...octahedral[5], kind: 'lonePair', label: 'E1' },
  ]),
  AX4E2: template('AX4E2', '팔면체', '사각평면형', ['90°', '180°'], [
    octahedral[0],
    octahedral[1],
    octahedral[2],
    octahedral[3],
    { ...octahedral[4], kind: 'lonePair', label: 'E1' },
    { ...octahedral[5], kind: 'lonePair', label: 'E2' },
  ]),
};

export const REQUIRED_VSEPR_TEMPLATE_AXE_NOTATIONS = [
  'AX2',
  'AX3',
  'AX2E',
  'AX4',
  'AX3E',
  'AX2E2',
];

export function getVseprGeometryTemplate(
  axeNotation?: string,
): VseprGeometryTemplate | null {
  const normalizedAxeNotation = normalizeVseprAxeNotation(axeNotation);

  if (!normalizedAxeNotation) {
    return null;
  }

  return VSEPR_GEOMETRY_TEMPLATES[normalizedAxeNotation] ?? null;
}

export function hasVseprGeometryTemplate(axeNotation?: string): boolean {
  return Boolean(getVseprGeometryTemplate(axeNotation));
}

export function normalizeVseprAxeNotation(axeNotation?: string): string | null {
  if (!axeNotation) {
    return null;
  }

  const match = /^AX(\d+)E(\d+)$/.exec(axeNotation);

  if (!match) {
    return axeNotation;
  }

  const bondedAtomCount = match[1];
  const lonePairCount = Number.parseInt(match[2], 10);

  if (lonePairCount === 0) {
    return `AX${bondedAtomCount}`;
  }

  if (lonePairCount === 1) {
    return `AX${bondedAtomCount}E`;
  }

  return axeNotation;
}

function template(
  axeNotation: string,
  electronDomainGeometryKo: string,
  molecularShapeKo: string,
  idealBondAngles: string[],
  vectors: VseprVector[],
): VseprGeometryTemplate {
  return {
    axeNotation,
    electronDomainGeometryKo,
    molecularShapeKo,
    idealBondAngles,
    vectors,
    note:
      'VSEPR 교육용 단위 벡터입니다. 실제 분자 좌표, 결합길이, 에너지 최소화 결과가 아닙니다.',
  };
}

function vector(
  x: number,
  y: number,
  z: number,
  kind: VseprVector['kind'],
  label: string,
): VseprVector {
  const length = Math.sqrt(x * x + y * y + z * z);

  if (length === 0) {
    return { x: 0, y: 0, z: 0, kind, label };
  }

  return {
    x: round(x / length),
    y: round(y / length),
    z: round(z / length),
    kind,
    label,
  };
}

function round(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}
