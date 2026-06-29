---
name: chem-file-interop
description: Use when implementing or reviewing chemical file import/export such as SMILES, Molfile, SDF, RXN, XYZ, PDB, CDXML-related notes, Open Babel conversion, and structure normalization boundaries.
---

# Chemical File Interoperability Skill

## Purpose

Use this skill when handling chemical file formats.

Chemical file formats are not interchangeable drawings. They carry different levels of structural, stereochemical, reaction, and coordinate information.

## MVP Formats

Support first:

- SMILES: compact structure string
- Molfile: editor structure exchange
- SVG/PNG: worksheet image export

Later support:

- SDF: molecule records and properties
- RXN: reaction structures
- XYZ: atom coordinates only; bonding may be absent
- PDB: biomolecular coordinate format
- CDXML: ChemDraw-like exchange; treat as advanced

## Rules

1. Every import must state what information may be lost.
2. XYZ import must not assume bonding without a bond perception step.
3. Image export is not machine-readable structure export.
4. Molfile/RXN export should be validated before saving.
5. If Open Babel is required, isolate it in backend or local CLI workflows.

## Import Result Type

```ts
export type ChemicalImportResult = {
  ok: boolean;
  format: string;
  moleculeInput?: MoleculeInput;
  warnings: string[];
  errors: string[];
};
```

## Export Result Type

```ts
export type ChemicalExportResult = {
  ok: boolean;
  format: 'smiles' | 'mol' | 'sdf' | 'svg' | 'png';
  data?: string | Blob;
  warnings: string[];
  errors: string[];
};
```

## Do Not

- Do not silently convert formats.
- Do not drop stereochemistry without warning.
- Do not treat PNG/SVG as restorable chemical structure.
- Do not promise perfect ChemDraw compatibility in MVP.

## Output Standard

When adding a format, document:

- what is preserved
- what may be lost
- validation tool used
- example file tested
- classroom use case
