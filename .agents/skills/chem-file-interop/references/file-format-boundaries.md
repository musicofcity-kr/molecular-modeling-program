# Chemical File Format Boundaries v2

## SMILES

Compact atom/bond graph representation. Dot-separated fragments represent distinct components. Default SMILES does not preserve 2D layout.

## Molfile

Atom/bond table plus coordinates and properties. Coordinates may be 2D or 3D; their presence does not prove experimental origin.

## SDF

One or more molecule records plus properties. Record boundaries and component boundaries are separate concepts.

## RXN

Reaction file containing reactant/product structures. Advanced unless reactions are required.

## XYZ

Atom coordinates only. Bonding is not guaranteed and must not be inferred silently.

## PDB

Biomolecular coordinate format. Bonding, protonation, disorder, and model interpretation require caution.

## SVG/PNG

Images only. Useful for worksheets but not reliable machine-readable chemical structure.

## Component Boundary Rule

Never merge separate components just because they are visually close. Apply an explicit `StructureIntent` policy after import.
