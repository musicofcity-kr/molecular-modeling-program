const V2000_COUNTS_LINE_INDEX = 3;
const V2000_VERSION_START_INDEX = 34;
const V2000_VERSION = 'V2000';

export type StrictV2000Layout = {
  lines: string[];
  countsLineIndex: typeof V2000_COUNTS_LINE_INDEX;
  atomCount: number;
  bondCount: number;
};

function parseCountField(field: string): number | null {
  if (field.length !== 3 || !/^\s*\d+\s*$/.test(field)) {
    return null;
  }

  const value = Number(field);

  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Reads only the standard fourth-line V2000 counts record.
 *
 * Header text is intentionally never scanned for a version token: molecule
 * titles and comments are untrusted and may contain counts-shaped text.
 */
export function parseStrictV2000Layout(
  molBlock: string,
): StrictV2000Layout | null {
  const lines = molBlock.replace(/\r\n?/g, '\n').split('\n');
  const countsLine = lines[V2000_COUNTS_LINE_INDEX];

  if (
    countsLine === undefined ||
    countsLine.slice(
      V2000_VERSION_START_INDEX,
      V2000_VERSION_START_INDEX + V2000_VERSION.length,
    ) !== V2000_VERSION
  ) {
    return null;
  }

  const atomCount = parseCountField(countsLine.slice(0, 3));
  const bondCount = parseCountField(countsLine.slice(3, 6));

  if (atomCount === null || bondCount === null) {
    return null;
  }

  return {
    lines,
    countsLineIndex: V2000_COUNTS_LINE_INDEX,
    atomCount,
    bondCount,
  };
}
