---
name: chem-file-interop
description: Use when implementing or reviewing chemical import/export such as SMILES, Molfile, SDF, RXN, XYZ, PDB, image export, coordinate provenance, structure normalization, and multi-component boundaries.
---

# Chemical File Interoperability Skill

## Purpose

Use this skill when handling chemical file formats.

Chemical files are not interchangeable drawings. They carry different structural, stereochemical, component, reaction, and coordinate information.

## MVP Formats

Support first:

- SMILES: compact graph representation; may contain multiple dot-separated components
- Molfile: atoms, bonds, and 2D/3D coordinates for one record
- SVG/PNG: worksheet image export only

Later support:

- SDF: molecule records and properties
- RXN: reaction structures
- XYZ: atom coordinates; bonding may be absent
- PDB: biomolecular coordinates with chemistry caveats
- CDXML: advanced ChemDraw-like exchange

## Rules

1. State what information is preserved or lost.
2. Preserve component boundaries; do not silently join fragments.
3. Do not infer a chemical bond merely from 2D/3D distance unless an explicit, source-checked bond-perception step is used.
4. XYZ import must not assume bonding without bond perception.
5. Image export is not machine-readable structure export.
6. Molfile/SDF/RXN export must be validated before saving.
7. Coordinate dimension and source must be labelled.
8. Stereochemistry loss must produce a warning.
9. If Open Babel or another converter is required, isolate it and record version/license.

## Import Result

```ts
export type ChemicalImportResult = {
  ok: boolean;
  format: string;
  moleculeInput?: MoleculeInput;
  detectedComponentCount?: number;
  coordinateDimension?: '2d' | '3d' | 'unknown';
  warnings: string[];
  errors: string[];
};
```

## Export Result

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
- Do not silently merge dot-separated components.
- Do not drop stereochemistry without warning.
- Do not treat PNG/SVG as restorable chemistry.
- Do not promise perfect ChemDraw compatibility.
- Do not assume file coordinates are experimentally determined.

## Output Standard

Document:

- what is preserved
- what may be lost
- component behavior
- coordinate dimension/source
- validation tool and version
- exact example files tested
- classroom use case
