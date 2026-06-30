import type {
  VseprAnalysis,
  VseprCentralAtomCandidate,
  VseprConfidence,
} from '../types/vsepr';

type MolAtom = {
  id: string;
  symbol: string;
  formalCharge: number;
};

type MolBond = {
  from: string;
  to: string;
  order: number;
  rawType: number;
};

type ParsedMolBlock = {
  atoms: MolAtom[];
  bonds: MolBond[];
  warnings: string[];
  developerLogs: string[];
};

type AtomEvaluation = {
  candidate: VseprCentralAtomCandidate;
  status: 'supported' | 'unsupported';
  warnings: string[];
  developerLogs: string[];
  lonePairCount?: number;
  stericNumber?: number;
  axeNotation?: string;
  electronDomainGeometryKo?: string;
  molecularShapeKo?: string;
  idealBondAngles?: string[];
  confidence: VseprConfidence;
};

export type AnalyzeVseprInput = {
  molBlock?: string;
  selectedCentralAtomId?: string;
  disableImplicitHydrogenInference?: boolean;
};

const VALENCE_ELECTRONS: Record<string, number> = {
  C: 4,
  N: 5,
  O: 6,
  F: 7,
  P: 5,
  S: 6,
  Cl: 7,
  Br: 7,
  I: 7,
};

const IMPLICIT_HYDROGEN_TARGET_VALENCE: Record<string, number> = {
  C: 4,
  N: 3,
  O: 2,
  F: 1,
  P: 3,
  S: 2,
  Cl: 1,
  Br: 1,
  I: 1,
};

const HEAVY_HALOGEN_CENTERS = new Set(['Br', 'I']);

const VSEPR_SHAPE_TABLE: Record<
  string,
  {
    electronDomainGeometryKo: string;
    molecularShapeKo: string;
    idealBondAngles: string[];
  }
> = {
  AX2: {
    electronDomainGeometryKo: '선형',
    molecularShapeKo: '선형',
    idealBondAngles: ['180°'],
  },
  AX3: {
    electronDomainGeometryKo: '삼각 평면',
    molecularShapeKo: '삼각 평면',
    idealBondAngles: ['120°'],
  },
  AX2E: {
    electronDomainGeometryKo: '삼각 평면',
    molecularShapeKo: '굽은형',
    idealBondAngles: ['<120°'],
  },
  AX4: {
    electronDomainGeometryKo: '정사면체',
    molecularShapeKo: '정사면체',
    idealBondAngles: ['109.5°'],
  },
  AX3E: {
    electronDomainGeometryKo: '정사면체',
    molecularShapeKo: '삼각뿔형',
    idealBondAngles: ['<109.5°'],
  },
  AX2E2: {
    electronDomainGeometryKo: '정사면체',
    molecularShapeKo: '굽은형',
    idealBondAngles: ['<109.5°'],
  },
  AX5: {
    electronDomainGeometryKo: '삼각쌍뿔',
    molecularShapeKo: '삼각쌍뿔',
    idealBondAngles: ['90°', '120°', '180°'],
  },
  AX4E: {
    electronDomainGeometryKo: '삼각쌍뿔',
    molecularShapeKo: '시소형',
    idealBondAngles: ['<90°', '<120°', '180°'],
  },
  AX3E2: {
    electronDomainGeometryKo: '삼각쌍뿔',
    molecularShapeKo: 'T자형',
    idealBondAngles: ['~90°', '180°'],
  },
  AX2E3: {
    electronDomainGeometryKo: '삼각쌍뿔',
    molecularShapeKo: '선형',
    idealBondAngles: ['180°'],
  },
  AX6: {
    electronDomainGeometryKo: '팔면체',
    molecularShapeKo: '팔면체',
    idealBondAngles: ['90°', '180°'],
  },
  AX5E: {
    electronDomainGeometryKo: '팔면체',
    molecularShapeKo: '사각뿔형',
    idealBondAngles: ['<90°', '180°'],
  },
  AX4E2: {
    electronDomainGeometryKo: '팔면체',
    molecularShapeKo: '사각평면형',
    idealBondAngles: ['90°', '180°'],
  },
};

export const SUPPORTED_AXE_NOTATIONS = Object.keys(VSEPR_SHAPE_TABLE);

export function analyzeVseprFromMolBlock(input: AnalyzeVseprInput): VseprAnalysis {
  if (!input.molBlock?.trim()) {
    return {
      status: 'not_requested',
      confidence: 'low',
      warnings: [],
      studentMessage:
        'RDKit.js 검증을 통과한 MOL block이 있을 때 VSEPR 예측을 실행할 수 있습니다.',
      developerLogs: ['VSEPR analysis not requested: empty mol block.'],
    };
  }

  try {
    const parsed = parseV2000MolBlock(input.molBlock);
    const evaluations = parsed.atoms
      .filter((atom) => atom.symbol !== 'H')
      .map((atom) =>
        evaluateCentralAtom(atom, parsed, input.disableImplicitHydrogenInference),
      );
    const candidates = evaluations
      .filter((evaluation) => evaluation.candidate.bondedAtomCount > 0)
      .map((evaluation) => evaluation.candidate);

    if (candidates.length === 0) {
      return {
        status: 'unsupported',
        centralAtomCandidates: [],
        confidence: 'low',
        warnings: [
          ...parsed.warnings,
          'VSEPR 분석에 사용할 중심 원자 후보를 찾지 못했습니다.',
        ],
        studentMessage:
          '이 구조에서는 VSEPR 중심 원자를 자동으로 찾을 수 없습니다.',
        developerLogs: parsed.developerLogs,
      };
    }

    if (!input.selectedCentralAtomId && candidates.length > 1) {
      return {
        status: 'needs_central_atom',
        centralAtomCandidates: candidates,
        confidence: 'medium',
        warnings: [
          ...parsed.warnings,
          '중심 원자 후보가 여러 개입니다. 전체 분자 구조로 단정하지 않고 원자별 국소 VSEPR 분석을 선택해야 합니다.',
        ],
        studentMessage:
          '중심 원자 후보가 여러 개입니다. 분석할 중심 원자를 선택해 주세요.',
        developerLogs: parsed.developerLogs,
      };
    }

    const centralAtomId = input.selectedCentralAtomId ?? candidates[0]?.atomId;
    const evaluation = evaluations.find(
      (item) => item.candidate.atomId === centralAtomId,
    );

    if (!evaluation) {
      return {
        status: 'needs_central_atom',
        centralAtomCandidates: candidates,
        confidence: 'low',
        warnings: [
          ...parsed.warnings,
          '선택한 중심 원자를 현재 MOL block에서 찾지 못했습니다.',
        ],
        studentMessage: '현재 구조에서 분석할 중심 원자를 다시 선택해 주세요.',
        developerLogs: parsed.developerLogs,
      };
    }

    if (evaluation.status === 'unsupported') {
      return {
        status: 'unsupported',
        centralAtomId: evaluation.candidate.atomId,
        centralAtomSymbol: evaluation.candidate.atomSymbol,
        centralAtomCandidates: candidates,
        bondedAtomCount: evaluation.candidate.bondedAtomCount,
        confidence: evaluation.confidence,
        warnings: [...parsed.warnings, ...evaluation.warnings],
        studentMessage:
          '선택한 중심 원자는 현재 VSEPR MVP 규칙으로 안정적으로 예측하기 어렵습니다.',
        developerLogs: [...parsed.developerLogs, ...evaluation.developerLogs],
      };
    }

    return {
      status: 'supported',
      centralAtomId: evaluation.candidate.atomId,
      centralAtomSymbol: evaluation.candidate.atomSymbol,
      centralAtomCandidates: candidates,
      bondedAtomCount: evaluation.candidate.bondedAtomCount,
      lonePairCount: evaluation.lonePairCount,
      stericNumber: evaluation.stericNumber,
      axeNotation: evaluation.axeNotation,
      electronDomainGeometryKo: evaluation.electronDomainGeometryKo,
      molecularShapeKo: evaluation.molecularShapeKo,
      idealBondAngles: evaluation.idealBondAngles,
      confidence: evaluation.confidence,
      warnings: [...parsed.warnings, ...evaluation.warnings],
      studentMessage:
        'VSEPR 이론에 따른 중심 원자 주변의 교육용 구조 예측입니다.',
      developerLogs: [...parsed.developerLogs, ...evaluation.developerLogs],
    };
  } catch (error) {
    return {
      status: 'error',
      confidence: 'low',
      warnings: ['MOL block을 VSEPR 분석용 그래프로 해석하지 못했습니다.'],
      studentMessage:
        '현재 구조 데이터로 VSEPR 예측을 실행하지 못했습니다. 구조를 다시 검증해 주세요.',
      developerLogs: [
        `VSEPR mol block parse failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ],
    };
  }
}

function parseV2000MolBlock(molBlock: string): ParsedMolBlock {
  const lines = molBlock.replace(/\r\n/g, '\n').split('\n');
  const countsLineIndex = lines.findIndex((line) => line.includes('V2000'));

  if (countsLineIndex < 0) {
    throw new Error('Only V2000 mol blocks are supported in the VSEPR MVP.');
  }

  const counts = lines[countsLineIndex].trim().split(/\s+/);
  const atomCount = Number.parseInt(counts[0] ?? '', 10);
  const bondCount = Number.parseInt(counts[1] ?? '', 10);

  if (!Number.isFinite(atomCount) || !Number.isFinite(bondCount)) {
    throw new Error('Invalid V2000 counts line.');
  }

  const atomLines = lines.slice(countsLineIndex + 1, countsLineIndex + 1 + atomCount);
  const bondLines = lines.slice(
    countsLineIndex + 1 + atomCount,
    countsLineIndex + 1 + atomCount + bondCount,
  );
  const propertyLines = lines.slice(countsLineIndex + 1 + atomCount + bondCount);
  const atoms = atomLines.map((line, index) => {
    const parts = line.trim().split(/\s+/);
    const symbol = parts[3];

    if (!symbol) {
      throw new Error(`Invalid atom line at index ${index + 1}.`);
    }

    return {
      id: String(index + 1),
      symbol,
      formalCharge: parseAtomLineChargeCode(Number.parseInt(parts[5] ?? '0', 10)),
    };
  });
  const bonds = bondLines.map((line) => {
    const parts = line.trim().split(/\s+/);
    const rawType = Number.parseInt(parts[2] ?? '1', 10);

    return {
      from: String(Number.parseInt(parts[0] ?? '0', 10)),
      to: String(Number.parseInt(parts[1] ?? '0', 10)),
      rawType,
      order: bondTypeToOrder(rawType),
    };
  });
  const warnings: string[] = [];
  const developerLogs = [
    `Parsed V2000 mol block with ${atoms.length} atoms and ${bonds.length} bonds.`,
  ];

  for (const line of propertyLines) {
    if (line.startsWith('M  CHG')) {
      applyChargeLine(line, atoms);
    }

    if (line.startsWith('M  RAD')) {
      warnings.push(
        '라디칼 표기가 포함된 구조는 VSEPR MVP에서 낮은 신뢰도로만 다룹니다.',
      );
      developerLogs.push(`VSEPR parser detected radical line: ${line.trim()}`);
    }
  }

  if (bonds.some((bond) => bond.rawType === 4)) {
    warnings.push('방향족/공명 결합은 VSEPR 전자쌍 영역 1개로 단순화했습니다.');
  }

  return { atoms, bonds, warnings, developerLogs };
}

function evaluateCentralAtom(
  atom: MolAtom,
  parsed: ParsedMolBlock,
  disableImplicitHydrogenInference = false,
): AtomEvaluation {
  const warnings: string[] = [];
  const developerLogs = [`Evaluating VSEPR center ${atom.symbol}${atom.id}.`];
  const connectedBonds = parsed.bonds.filter(
    (bond) => bond.from === atom.id || bond.to === atom.id,
  );
  const explicitBondedAtomCount = connectedBonds.length;
  const explicitBondOrderSum = connectedBonds.reduce(
    (sum, bond) => sum + bond.order,
    0,
  );
  const explicitHydrogenCount = connectedBonds.filter((bond) => {
    const neighborId = bond.from === atom.id ? bond.to : bond.from;
    return parsed.atoms.find((item) => item.id === neighborId)?.symbol === 'H';
  }).length;
  const inferredHydrogenCount = disableImplicitHydrogenInference
    ? 0
    : inferImplicitHydrogenCount(atom, explicitBondOrderSum);
  const bondedAtomCount =
    explicitBondedAtomCount + inferredHydrogenCount;
  const candidate = {
    atomId: atom.id,
    atomSymbol: atom.symbol,
    atomLabel: `${atom.symbol}${atom.id}`,
    bondedAtomCount,
    explicitBondedAtomCount,
    inferredHydrogenCount,
  };
  const valenceElectrons = VALENCE_ELECTRONS[atom.symbol];

  if (valenceElectrons === undefined) {
    return {
      candidate,
      status: 'unsupported',
      confidence: 'low',
      warnings: [`지원하지 않는 중심 원소입니다: ${atom.symbol}`],
      developerLogs,
    };
  }

  if (inferredHydrogenCount > 0) {
    warnings.push(
      '2D MOL block에서 생략된 수소를 일반 원자가 규칙으로 추정했습니다.',
    );
  }

  const bondOrderSum = explicitBondOrderSum + inferredHydrogenCount;
  const lonePairRaw = (valenceElectrons - bondOrderSum - atom.formalCharge) / 2;

  if (!Number.isInteger(lonePairRaw) || lonePairRaw < 0) {
    return {
      candidate,
      status: 'unsupported',
      confidence: 'low',
      warnings: [
        ...warnings,
        '비공유 전자쌍 수를 정수로 추정할 수 없습니다. 전하, 라디칼, 공명 구조를 확인해 주세요.',
      ],
      developerLogs: [
        ...developerLogs,
        `Non-integer lone-pair estimate: ${lonePairRaw}.`,
      ],
    };
  }

  const lonePairCount = lonePairRaw;
  const stericNumber = bondedAtomCount + lonePairCount;
  const axeNotation =
    lonePairCount > 0 ? `AX${bondedAtomCount}E${lonePairCount}` : `AX${bondedAtomCount}`;
  const shape = VSEPR_SHAPE_TABLE[axeNotation];

  if (!shape) {
    return {
      candidate,
      status: 'unsupported',
      confidence: 'low',
      lonePairCount,
      stericNumber,
      axeNotation,
      warnings: [
        ...warnings,
        `현재 MVP 매핑 테이블에서 지원하지 않는 AXE 표기입니다: ${axeNotation}`,
      ],
      developerLogs,
    };
  }

  const confidence = getConfidence(atom, parsed, warnings);

  return {
    candidate,
    status: 'supported',
    confidence,
    warnings,
    developerLogs,
    lonePairCount,
    stericNumber,
    axeNotation,
    ...shape,
  };
}

function inferImplicitHydrogenCount(atom: MolAtom, explicitBondOrderSum: number): number {
  const targetValence = IMPLICIT_HYDROGEN_TARGET_VALENCE[atom.symbol];

  if (targetValence === undefined) {
    return 0;
  }

  const adjustedTargetValence = targetValence + Math.max(atom.formalCharge, 0);
  const inferred = adjustedTargetValence - explicitBondOrderSum;

  if (inferred <= 0 || !Number.isInteger(inferred)) {
    return 0;
  }

  return inferred;
}

function getConfidence(
  atom: MolAtom,
  parsed: ParsedMolBlock,
  warnings: string[],
): VseprConfidence {
  if (HEAVY_HALOGEN_CENTERS.has(atom.symbol)) {
    return 'medium';
  }

  if (atom.formalCharge !== 0 || parsed.bonds.some((bond) => bond.rawType === 4)) {
    return 'medium';
  }

  return warnings.length > 0 ? 'medium' : 'high';
}

function bondTypeToOrder(rawType: number): number {
  switch (rawType) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 3;
    case 4:
      return 1.5;
    default:
      return 1;
  }
}

function parseAtomLineChargeCode(chargeCode: number): number {
  switch (chargeCode) {
    case 1:
      return 3;
    case 2:
      return 2;
    case 3:
      return 1;
    case 5:
      return -1;
    case 6:
      return -2;
    case 7:
      return -3;
    default:
      return 0;
  }
}

function applyChargeLine(line: string, atoms: MolAtom[]) {
  const parts = line.trim().split(/\s+/);
  const pairCount = Number.parseInt(parts[2] ?? '0', 10);

  for (let index = 0; index < pairCount; index += 1) {
    const atomIndex = Number.parseInt(parts[3 + index * 2] ?? '0', 10);
    const charge = Number.parseInt(parts[4 + index * 2] ?? '0', 10);
    const atom = atoms[atomIndex - 1];

    if (atom) {
      atom.formalCharge = charge;
    }
  }
}
