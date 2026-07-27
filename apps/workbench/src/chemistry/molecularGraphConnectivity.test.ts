import { describe, expect, it } from 'vitest';
import {
  evaluateConnectivity,
  summarizeRDKitGraphJson,
} from './molecularGraphConnectivity';

function rdkitJson(
  atomCount: number,
  bonds: Array<[number, number]>,
): string {
  return JSON.stringify({
    rdkitjson: { version: 12 },
    molecules: [
      {
        atoms: Array.from({ length: atomCount }, () => ({})),
        bonds: bonds.map((atoms) => ({ atoms })),
      },
    ],
  });
}

describe('summarizeRDKitGraphJson', () => {
  it('reports an empty graph without inventing a component', () => {
    expect(summarizeRDKitGraphJson(rdkitJson(0, []))).toEqual({
      atomCount: 0,
      bondCount: 0,
      componentCount: 0,
      componentAtomCounts: [],
      isSingleComponent: false,
      isolatedAtomCount: 0,
    });
  });

  it('counts a single isolated atom as one connected component', () => {
    expect(summarizeRDKitGraphJson(rdkitJson(1, []))).toEqual({
      atomCount: 1,
      bondCount: 0,
      componentCount: 1,
      componentAtomCounts: [1],
      isSingleComponent: true,
      isolatedAtomCount: 1,
    });
  });

  it('distinguishes four separately placed carbon atoms from a carbon chain', () => {
    const separated = summarizeRDKitGraphJson(rdkitJson(4, []));
    const chain = summarizeRDKitGraphJson(
      rdkitJson(4, [
        [0, 1],
        [1, 2],
        [2, 3],
      ]),
    );

    expect(separated).toMatchObject({
      atomCount: 4,
      bondCount: 0,
      componentCount: 4,
      componentAtomCounts: [1, 1, 1, 1],
      isSingleComponent: false,
      isolatedAtomCount: 4,
    });
    expect(chain).toMatchObject({
      atomCount: 4,
      bondCount: 3,
      componentCount: 1,
      componentAtomCounts: [4],
      isSingleComponent: true,
      isolatedAtomCount: 0,
    });
  });

  it.each([
    {
      label: 'branched carbon skeleton',
      bonds: [
        [0, 1],
        [0, 2],
        [0, 3],
      ] as Array<[number, number]>,
      expectedBondCount: 3,
    },
    {
      label: 'four-membered ring',
      bonds: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
      ] as Array<[number, number]>,
      expectedBondCount: 4,
    },
  ])('recognizes a connected $label', ({ bonds, expectedBondCount }) => {
    expect(summarizeRDKitGraphJson(rdkitJson(4, bonds))).toMatchObject({
      atomCount: 4,
      bondCount: expectedBondCount,
      componentCount: 1,
      componentAtomCounts: [4],
      isSingleComponent: true,
      isolatedAtomCount: 0,
    });
  });

  it('fails closed when an RDKit JSON bond points outside the atom list', () => {
    expect(() =>
      summarizeRDKitGraphJson(rdkitJson(2, [[0, 2]])),
    ).toThrowError(/outside the atom list/i);
  });
});

describe('evaluateConnectivity', () => {
  const disconnectedPair = summarizeRDKitGraphJson(rdkitJson(2, []));

  it('blocks multiple components when the intent is a single molecule', () => {
    expect(evaluateConnectivity(disconnectedPair, 'single-molecule')).toMatchObject({
      intent: 'single-molecule',
      status: 'multiple-components-blocked',
      allowed: false,
    });
  });

  it.each(['ionic-compound', 'mixture'] as const)(
    'allows multiple components for explicit %s intent',
    (intent) => {
      expect(evaluateConnectivity(disconnectedPair, intent)).toMatchObject({
        intent,
        status: 'multiple-components-allowed',
        allowed: true,
      });
    },
  );

  it('marks an empty graph as empty regardless of intent', () => {
    const empty = summarizeRDKitGraphJson(rdkitJson(0, []));

    expect(evaluateConnectivity(empty, 'single-molecule')).toMatchObject({
      status: 'empty',
      allowed: false,
    });
  });
});
