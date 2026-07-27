---
name: ketcher-integration
description: Use when integrating Ketcher or another 2D chemical editor, including stable adapter APIs, editor loading, direct atom/bond/chain construction, structure-change observation, import/export, and classroom interaction reliability.
---

# Ketcher Integration Skill

## Purpose

Use this skill for all 2D chemical editor work.

Ketcher is the structure input and editing surface. It is not the only source of chemical truth. Extracted outputs must pass connectivity policy and RDKit validation before classroom-facing calculations are trusted.

## Required Workflow

1. Confirm exact editor packages and installed versions.
2. Check official documentation/repository for the exact public APIs and tools needed.
3. Record the decision in `docs/LIBRARY_DECISION_LOG.md`.
4. Reproduce the real student interaction before editing code.
5. Build or update a minimal app-owned editor adapter.
6. Support extraction of SMILES and Molfile/graph input.
7. Observe structure changes using only verified public APIs where possible.
8. Pass extracted structure to graph/connectivity inspection.
9. Pass accepted structure to RDKit validation.
10. Show editor and construction errors in Korean classroom language.
11. Verify actual pointer and touch interaction.

## Adapter Interface Target

Use an equivalent of:

```ts
export type ChemicalEditorHandle = {
  getSmiles(): Promise<string>;
  getMolfile(): Promise<string>;
  extractStructure(): Promise<ExtractedStructureData>;
  setMolecule(input: { smiles?: string; molBlock?: string }): Promise<void>;
  clear(): Promise<void>;
  getGraphSummary?(): Promise<MoleculeGraphSummary>;
  subscribeToStructureChange?(
    callback: (structure: ExtractedStructureData) => void,
  ): () => void;
};
```

Do not invent editor APIs. Optional methods must be implemented only after checking support in the pinned version. If the editor cannot expose a graph summary directly, derive it after extraction in the connectivity layer.

## Direct Drawing Requirements

Minimum behaviors:

- place a single atom
- draw a bond from an existing atom
- create a four-carbon linear chain
- create a branch
- undo/redo
- clear
- load an example without stale state
- extract the same connected structure the student sees

When a chain tool exists in the installed version, verify it. Also verify a bond-drag fallback so students are not blocked by toolbar discoverability.

## Private-API Rule

Do not depend on undocumented Ketcher DOM, Redux stores, class names, or internal events unless all are true:

- no public alternative exists
- exact version is pinned
- risk is recorded
- integration and E2E regressions cover it
- upgrade instructions identify the dependency

## Do Not

- Do not let app panels call raw Ketcher APIs directly.
- Do not assume visual proximity creates a chemical bond.
- Do not infer missing bonds from screen coordinates.
- Do not assume a non-empty canvas is one molecule.
- Do not suppress load/change/extraction errors.
- Do not hard-code CDN assets without offline/classroom implications.
- Do not describe 2D clean/layout as VSEPR geometry.

## Test Cases

- editor initializes once and reports ready
- known example loads and extracts
- direct C4 chain extracts as one component
- four isolated carbons remain multiple components
- branch, undo, redo, clear work
- extraction errors are normalized
- structure change clears stale validation/VSEPR/3D state
- mobile/touch direct chain path works or unsupported behavior is disclosed

## Output Standard

Report:

- dependency/version and primary source checked
- exact gesture reproduced
- adapter API changed or unchanged
- graph/connectivity handoff
- RDKit handoff
- automated tests
- manual pointer/touch evidence
- private-API risks, if any
