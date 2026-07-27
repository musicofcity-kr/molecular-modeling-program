import type {
  ConnectivityDecision,
  MoleculeGraphSummary,
  StructureIntent,
} from '../types/molecule';

type RDKitJsonBond = {
  atoms?: unknown;
};

type RDKitJsonMolecule = {
  atoms?: unknown;
  bonds?: unknown;
};

type RDKitJsonPayload = {
  molecules?: unknown;
};

function parseRDKitJson(json: string): RDKitJsonPayload {
  const parsed = JSON.parse(json) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('RDKit JSON root must be an object.');
  }

  return parsed as RDKitJsonPayload;
}

function readGraphArrays(json: string): {
  atomCount: number;
  bonds: Array<[number, number]>;
} {
  const parsed = parseRDKitJson(json);

  if (!Array.isArray(parsed.molecules) || parsed.molecules.length !== 1) {
    throw new Error('RDKit JSON must contain exactly one molecule graph.');
  }

  const molecule = parsed.molecules[0] as RDKitJsonMolecule;

  if (!molecule || typeof molecule !== 'object' || Array.isArray(molecule)) {
    throw new Error('RDKit JSON molecule graph must be an object.');
  }

  if (!Array.isArray(molecule.atoms)) {
    throw new Error('RDKit JSON molecule graph is missing its atom list.');
  }

  const rawBonds = molecule.bonds ?? [];

  if (!Array.isArray(rawBonds)) {
    throw new Error('RDKit JSON molecule graph has an invalid bond list.');
  }

  const atomCount = molecule.atoms.length;
  const bonds = rawBonds.map((rawBond, bondIndex): [number, number] => {
    if (!rawBond || typeof rawBond !== 'object' || Array.isArray(rawBond)) {
      throw new Error(`RDKit JSON bond ${bondIndex} must be an object.`);
    }

    const endpoints = (rawBond as RDKitJsonBond).atoms;

    if (
      !Array.isArray(endpoints) ||
      endpoints.length !== 2 ||
      !endpoints.every(Number.isInteger)
    ) {
      throw new Error(
        `RDKit JSON bond ${bondIndex} must contain two integer atom indices.`,
      );
    }

    const [beginAtomIndex, endAtomIndex] = endpoints as [number, number];

    if (
      beginAtomIndex < 0 ||
      endAtomIndex < 0 ||
      beginAtomIndex >= atomCount ||
      endAtomIndex >= atomCount
    ) {
      throw new Error(
        `RDKit JSON bond ${bondIndex} points outside the atom list.`,
      );
    }

    if (beginAtomIndex === endAtomIndex) {
      throw new Error(`RDKit JSON bond ${bondIndex} is self-referential.`);
    }

    return [beginAtomIndex, endAtomIndex];
  });

  return { atomCount, bonds };
}

export function summarizeRDKitGraphJson(json: string): MoleculeGraphSummary {
  const { atomCount, bonds } = readGraphArrays(json);
  const adjacency = Array.from(
    { length: atomCount },
    () => new Set<number>(),
  );

  for (const [beginAtomIndex, endAtomIndex] of bonds) {
    adjacency[beginAtomIndex].add(endAtomIndex);
    adjacency[endAtomIndex].add(beginAtomIndex);
  }

  const visited = new Set<number>();
  const componentAtomCounts: number[] = [];

  for (let atomIndex = 0; atomIndex < atomCount; atomIndex += 1) {
    if (visited.has(atomIndex)) {
      continue;
    }

    const queue = [atomIndex];
    visited.add(atomIndex);
    let componentAtomCount = 0;

    while (queue.length > 0) {
      const currentAtomIndex = queue.shift();

      if (currentAtomIndex === undefined) {
        break;
      }

      componentAtomCount += 1;

      for (const neighborAtomIndex of adjacency[currentAtomIndex]) {
        if (!visited.has(neighborAtomIndex)) {
          visited.add(neighborAtomIndex);
          queue.push(neighborAtomIndex);
        }
      }
    }

    componentAtomCounts.push(componentAtomCount);
  }

  const componentCount = componentAtomCounts.length;

  return {
    atomCount,
    bondCount: bonds.length,
    componentCount,
    componentAtomCounts,
    isSingleComponent: atomCount > 0 && componentCount === 1,
    isolatedAtomCount: adjacency.filter((neighbors) => neighbors.size === 0).length,
  };
}

export function evaluateConnectivity(
  summary: MoleculeGraphSummary,
  intent: StructureIntent,
): ConnectivityDecision {
  if (summary.atomCount === 0) {
    return {
      allowed: false,
      status: 'empty',
      intent,
      summary,
      warnings: [],
      errors: ['The molecular graph is empty.'],
    };
  }

  if (summary.isSingleComponent) {
    return {
      allowed: true,
      status: 'single-component',
      intent,
      summary,
      warnings: [],
      errors: [],
    };
  }

  if (intent === 'single-molecule') {
    return {
      allowed: false,
      status: 'multiple-components-blocked',
      intent,
      summary,
      warnings: [],
      errors: [
        'Multiple connected components are not allowed for a single molecule.',
      ],
    };
  }

  return {
    allowed: true,
    status: 'multiple-components-allowed',
    intent,
    summary,
    warnings: [
      `Multiple connected components are allowed for explicit ${intent} intent.`,
    ],
    errors: [],
  };
}
