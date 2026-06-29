type RDKitJsonAtom = {
  z?: number;
  impHs?: number;
  isotope?: number;
};

type RDKitJsonPayload = {
  defaults?: {
    atom?: {
      z?: number;
      impHs?: number;
      isotope?: number;
    };
  };
  molecules?: Array<{
    atoms?: RDKitJsonAtom[];
  }>;
};

const atomicSymbols: Record<number, string> = {
  1: 'H',
  5: 'B',
  6: 'C',
  7: 'N',
  8: 'O',
  9: 'F',
  14: 'Si',
  15: 'P',
  16: 'S',
  17: 'Cl',
  35: 'Br',
  53: 'I',
};

function addElement(counts: Map<string, number>, symbol: string, count = 1): void {
  counts.set(symbol, (counts.get(symbol) ?? 0) + count);
}

function formatFormula(counts: Map<string, number>): string {
  const orderedSymbols = [
    ...(['C', 'H'].filter((symbol) => counts.has(symbol))),
    ...Array.from(counts.keys())
      .filter((symbol) => symbol !== 'C' && symbol !== 'H')
      .sort(),
  ];

  return orderedSymbols
    .map((symbol) => {
      const count = counts.get(symbol) ?? 0;
      return count === 1 ? symbol : `${symbol}${count}`;
    })
    .join('');
}

export function formulaFromRDKitJson(json: string): string {
  const parsed = JSON.parse(json) as RDKitJsonPayload;
  const atoms = parsed.molecules?.[0]?.atoms;

  if (!atoms?.length) {
    throw new Error('RDKit JSON does not contain atom data.');
  }

  const defaultAtom = parsed.defaults?.atom ?? {};
  const counts = new Map<string, number>();

  for (const atom of atoms) {
    const atomicNumber = atom.z ?? defaultAtom.z;
    const symbol = atomicNumber ? atomicSymbols[atomicNumber] : undefined;

    if (!symbol) {
      throw new Error(
        `Unsupported atomic number for formula display: ${atomicNumber ?? 'unknown'}`,
      );
    }

    addElement(counts, symbol);

    const implicitHydrogens = atom.impHs ?? defaultAtom.impHs ?? 0;
    if (implicitHydrogens > 0) {
      addElement(counts, 'H', implicitHydrogens);
    }
  }

  return formatFormula(counts);
}
