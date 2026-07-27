import type {
  VseprAnalysis,
  VseprCentralAtomCandidate,
  VseprConfidence,
} from '../types/vsepr';
import { parseStrictV2000Layout } from '../chemistry/v2000MolBlock';

type MolAtom = {
  id: string;
  symbol: string;
  formalCharge: number;
  declaredValence: number;
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
  containsQueryFeature: boolean;
  containsRadical: boolean;
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
  Be: 2,
  B: 3,
  C: 4,
  N: 5,
  O: 6,
  F: 7,
  P: 5,
  S: 6,
  Cl: 7,
  Br: 7,
  I: 7,
  Xe: 8,
};

const IMPLICIT_HYDROGEN_TARGET_VALENCE: Record<string, number> = {
  Be: 2,
  B: 3,
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

const MEDIUM_CONFIDENCE_CENTERS = new Set(['Br', 'I', 'Xe']);
const V2000_QUERY_PROPERTY_TAGS = new Set(['SUB', 'UNS', 'RBC']);

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

    if (parsed.containsQueryFeature) {
      return {
        status: 'unsupported',
        scope: 'local-center',
        confidence: 'low',
        warnings: parsed.warnings,
        studentMessage:
          '질의 또는 모호한 원자·결합 표기가 있는 구조는 현재 교육용 VSEPR 분석 범위에서 지원하지 않습니다.',
        developerLogs: parsed.developerLogs,
      };
    }

    if (parsed.containsRadical) {
      return {
        status: 'unsupported',
        scope: 'local-center',
        confidence: 'low',
        warnings: parsed.warnings,
        studentMessage:
          '라디칼 구조는 현재 교육용 VSEPR 분석 범위 밖입니다. 교사와 함께 구조를 검토해 주세요.',
        developerLogs: parsed.developerLogs,
      };
    }

    const componentCount = countConnectedComponents(parsed);

    if (componentCount > 1) {
      return {
        status: 'unsupported',
        scope: 'local-center',
        confidence: 'low',
        warnings: [
          ...parsed.warnings,
          '현재 구조가 여러 조각으로 나뉘어 있어 국소 VSEPR 분석을 중단했습니다.',
        ],
        studentMessage:
          '현재 구조가 여러 조각으로 나뉘어 있습니다. 하나의 분자를 만들려면 원자 사이를 결합으로 연결해 주세요.',
        developerLogs: [
          ...parsed.developerLogs,
          `VSEPR analysis blocked disconnected atom graph: componentCount=${componentCount}.`,
        ],
      };
    }

    const evaluations = parsed.atoms
      .filter((atom) => atom.symbol !== 'H')
      .map((atom) =>
        evaluateCentralAtom(atom, parsed, input.disableImplicitHydrogenInference),
      );
    const candidates = evaluations
      .filter(
        (evaluation) =>
          evaluation.status === 'supported' &&
          evaluation.candidate.bondedAtomCount > 0,
      )
      .map((evaluation) => evaluation.candidate);
    const requestedCentralAtomId = input.selectedCentralAtomId?.trim() || undefined;

    if (candidates.length === 0 && !requestedCentralAtomId) {
      return {
        status: 'unsupported',
        scope: 'local-center',
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

    const centralAtomId =
      requestedCentralAtomId ?? findClearCentralAtomId(candidates);

    if (!centralAtomId && candidates.length > 1) {
      return {
        status: 'needs_central_atom',
        scope: 'local-center',
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

    const evaluation = evaluations.find(
      (item) => item.candidate.atomId === (centralAtomId ?? candidates[0]?.atomId),
    );

    if (!evaluation) {
      return {
        status: 'needs_central_atom',
        scope: 'local-center',
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
        scope: 'local-center',
        centralAtomId: evaluation.candidate.atomId,
        centralAtomSymbol: evaluation.candidate.atomSymbol,
        centralAtomLabel: evaluation.candidate.atomLabel,
        centralAtomCandidates: candidates,
        bondedAtomCount: evaluation.candidate.bondedAtomCount,
        confidence: evaluation.confidence,
        warnings: [...parsed.warnings, ...evaluation.warnings],
        studentMessage:
          '선택한 중심 원자는 현재 교육용 VSEPR 분석 범위에서 안정적으로 예측하기 어렵습니다.',
        developerLogs: [...parsed.developerLogs, ...evaluation.developerLogs],
      };
    }

    return {
      status: 'supported',
      scope: 'local-center',
      centralAtomId: evaluation.candidate.atomId,
      centralAtomSymbol: evaluation.candidate.atomSymbol,
      centralAtomLabel: evaluation.candidate.atomLabel,
      centralAtomCandidates: candidates,
      bondedAtomCount: evaluation.candidate.bondedAtomCount,
      lonePairCount: evaluation.lonePairCount,
      stericNumber: evaluation.stericNumber,
      axeNotation: evaluation.axeNotation,
      electronDomainGeometryKo: evaluation.electronDomainGeometryKo,
      molecularShapeKo: evaluation.molecularShapeKo,
      idealBondAngles: evaluation.idealBondAngles,
      angleEvidence: {
        vseprIdealAngles: [...(evaluation.idealBondAngles ?? [])],
      },
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
  const layout = parseStrictV2000Layout(molBlock);

  if (!layout) {
    throw new Error(
      'Invalid or non-standard V2000 counts line at the required fourth line.',
    );
  }

  const { lines, countsLineIndex, atomCount, bondCount } = layout;

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
      declaredValence: Number.parseInt(parts[9] ?? '0', 10) || 0,
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
  let containsQueryFeature = false;
  let containsRadical = false;
  const developerLogs = [
    `Parsed V2000 mol block with ${atoms.length} atoms and ${bonds.length} bonds.`,
  ];
  const queryAtomSymbols = new Set(['*', 'A', 'Q', 'L', 'LP', 'R', 'R#']);

  for (const atom of atoms) {
    if (atom.declaredValence === 15) {
      developerLogs.push(
        `VSEPR parser honored declared zero valence for ${atom.symbol}${atom.id}.`,
      );
    }

    if (queryAtomSymbols.has(atom.symbol)) {
      containsQueryFeature = true;
      warnings.push(
        `질의 또는 더미 원자 표기(${atom.symbol})가 포함되어 VSEPR 추정을 중단했습니다.`,
      );
      developerLogs.push(
        `VSEPR parser detected query atom symbol ${atom.symbol}.`,
      );
    }
  }

  for (const bond of bonds) {
    if (bond.rawType >= 5 && bond.rawType <= 8) {
      containsQueryFeature = true;
      warnings.push(
        `질의 또는 모호한 결합 형식(${bond.rawType})이 포함되어 VSEPR 추정을 중단했습니다.`,
      );
      developerLogs.push(
        `VSEPR parser detected query bond type ${bond.rawType}.`,
      );
    }
  }

  for (const line of propertyLines) {
    const [recordType, propertyTag] = line.trim().split(/\s+/);

    if (
      recordType === 'M' &&
      propertyTag &&
      V2000_QUERY_PROPERTY_TAGS.has(propertyTag)
    ) {
      containsQueryFeature = true;
      warnings.push(
        `V2000 질의 속성(M ${propertyTag})이 포함되어 VSEPR 추정을 중단했습니다.`,
      );
      developerLogs.push(
        `VSEPR parser detected query property M ${propertyTag}.`,
      );
    }

    if (line.startsWith('M  CHG')) {
      applyChargeLine(line, atoms);
    }

    if (line.startsWith('M  RAD')) {
      containsRadical = true;
      warnings.push(
        '라디칼 표기가 포함된 구조는 현재 교육용 VSEPR 분석 범위에서 지원하지 않습니다.',
      );
      developerLogs.push(`VSEPR parser detected radical line: ${line.trim()}`);
    }
  }

  if (bonds.some((bond) => bond.rawType === 4)) {
    warnings.push('방향족/공명 결합은 VSEPR 전자쌍 영역 1개로 단순화했습니다.');
  }

  return {
    atoms,
    bonds,
    containsQueryFeature,
    containsRadical,
    warnings,
    developerLogs,
  };
}

function countConnectedComponents(parsed: ParsedMolBlock): number {
  const adjacency = new Map(
    parsed.atoms.map((atom) => [atom.id, new Set<string>()] as const),
  );

  for (const bond of parsed.bonds) {
    const fromNeighbors = adjacency.get(bond.from);
    const toNeighbors = adjacency.get(bond.to);

    if (!fromNeighbors || !toNeighbors) {
      continue;
    }

    fromNeighbors.add(bond.to);
    toNeighbors.add(bond.from);
  }

  const visited = new Set<string>();
  let componentCount = 0;

  for (const atom of parsed.atoms) {
    if (visited.has(atom.id)) {
      continue;
    }

    componentCount += 1;
    const pending = [atom.id];

    while (pending.length > 0) {
      const currentAtomId = pending.pop();

      if (!currentAtomId || visited.has(currentAtomId)) {
        continue;
      }

      visited.add(currentAtomId);

      for (const neighborId of adjacency.get(currentAtomId) ?? []) {
        if (!visited.has(neighborId)) {
          pending.push(neighborId);
        }
      }
    }
  }

  return componentCount;
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

  if (hasSulfurOxygenResonanceSimplification(atom, connectedBonds, parsed.atoms)) {
    warnings.push(
      'S-O 결합의 공명과 전자 분포를 하나의 Lewis 구조로 단순화한 국소 VSEPR 예측입니다.',
    );
    developerLogs.push(
      `VSEPR center ${atom.symbol}${atom.id} uses a simplified sulfur-oxygen resonance model.`,
    );
  }

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
    lonePairCount > 0
      ? `AX${bondedAtomCount}${formatLonePairNotation(lonePairCount)}`
      : `AX${bondedAtomCount}`;
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

function hasSulfurOxygenResonanceSimplification(
  atom: MolAtom,
  connectedBonds: MolBond[],
  atoms: MolAtom[],
): boolean {
  if (atom.symbol !== 'S') {
    return false;
  }

  const oxygenBonds = connectedBonds.filter((bond) => {
    const neighborId = bond.from === atom.id ? bond.to : bond.from;
    return atoms.find((candidate) => candidate.id === neighborId)?.symbol === 'O';
  });

  return (
    oxygenBonds.length >= 2 &&
    oxygenBonds.some((bond) => bond.order > 1)
  );
}

function inferImplicitHydrogenCount(atom: MolAtom, explicitBondOrderSum: number): number {
  if (atom.declaredValence === 15) {
    return 0;
  }

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

function findClearCentralAtomId(
  candidates: VseprCentralAtomCandidate[],
): string | null {
  if (candidates.length === 1) {
    return candidates[0].atomId;
  }

  const possibleCenters = candidates.filter(
    (candidate) => candidate.explicitBondedAtomCount >= 2,
  );
  const terminalLigands = candidates.filter(
    (candidate) =>
      candidate.explicitBondedAtomCount === 1 &&
      candidate.inferredHydrogenCount === 0 &&
      candidate.bondedAtomCount === 1,
  );

  if (
    possibleCenters.length === 1 &&
    terminalLigands.length === candidates.length - 1
  ) {
    return possibleCenters[0].atomId;
  }

  return null;
}

function formatLonePairNotation(lonePairCount: number): string {
  return lonePairCount === 1 ? 'E' : `E${lonePairCount}`;
}

function getConfidence(
  atom: MolAtom,
  parsed: ParsedMolBlock,
  warnings: string[],
): VseprConfidence {
  if (MEDIUM_CONFIDENCE_CENTERS.has(atom.symbol)) {
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
