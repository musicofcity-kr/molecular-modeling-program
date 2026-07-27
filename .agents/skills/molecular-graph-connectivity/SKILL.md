---
name: molecular-graph-connectivity
description: Use when deriving atom/bond graphs, counting connected components, detecting disconnected atoms or fragments, applying single-molecule versus salt/mixture policy, and gating educational molecule results.
---

# Molecular Graph Connectivity Skill

## Purpose

Use this skill whenever the application must decide whether the student constructed one connected molecular graph or several disconnected fragments.

Parsing success and connectivity success are separate states.

## Required Types

```ts
export type StructureIntent =
  | 'single-molecule'
  | 'ionic-compound'
  | 'mixture';

export type MoleculeGraphSummary = {
  atomCount: number;
  bondCount: number;
  componentCount: number;
  componentAtomCounts: number[];
  isSingleComponent: boolean;
  isolatedAtomCount: number;
};

export type ConnectivityDecision = {
  ok: boolean;
  status:
    | 'empty'
    | 'single-component'
    | 'multiple-components-allowed'
    | 'multiple-components-blocked';
  intent: StructureIntent;
  summary: MoleculeGraphSummary;
  warnings: string[];
  errors: string[];
};
```

Field names may be adapted to the codebase, but equivalent information must exist.

## Source of Truth

Derive connectivity from a validated or safely parsed atom/bond graph.

Preferred order:

1. Official RDKit graph/fragment API verified for the installed version.
2. RDKit molecule JSON containing atoms and bonds.
3. A tested Molfile parser limited to the supported format.

Do not use regex over SMILES to count components, atoms, or bonds.

## Component Algorithm

If a graph traversal is implemented locally:

1. Build an adjacency list from atom IDs and bonds.
2. Include isolated atoms as components.
3. Run BFS/DFS/union-find.
4. Count every unvisited atom as a new component.
5. Return component sizes and isolated-atom count.
6. Test rings, branches, disconnected fragments, and zero-bond structures.

## Intent Policy

### `single-molecule`

- Default for free drawing and most covalent-molecule activities.
- Require exactly one connected component when atom count > 0.
- Multiple components block confident completion.

### `ionic-compound`

- Multiple charged components may be expected.
- Require explicit activity configuration.
- Display that the notation represents ions/formula units, not an isolated covalent molecule.

### `mixture`

- Multiple components may be expected.
- Keep per-component identities where possible.
- Do not report a single molecular formula/molecular mass as though the mixture were one molecule unless the educational task explicitly defines a combined record.

## Result Gating

Recommended order:

```text
non-empty
→ graph extracted
→ connectivity policy passes
→ RDKit validation passes
→ formula/mass/canonical output
```

For multi-component allowed inputs, downstream formula/mass behavior must be explicitly specified and tested.

## Required Tests

- Empty graph: A=0, B=0, C=0.
- One isolated atom: A=1, B=0, C=1.
- Four isolated carbons: A=4, B=0, C=4.
- Linear C4: A=4, B=3, C=1.
- Branched C4: A=4, B=3, C=1.
- Ring: one component.
- Ionic pair: multiple components allowed only in ionic mode.
- Mixture: multiple components allowed only in mixture mode.

## Output Standard

Report:

- graph source
- algorithm/API used
- intent policy
- expected and actual counts
- UI gate behavior
- multi-component limitations
