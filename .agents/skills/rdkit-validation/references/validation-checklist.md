# Molecule Validation Checklist

## Input and lifecycle

- Empty input fails.
- Invalid SMILES/Molfile fails.
- RDKit initializes once or retries safely after failure.
- Molecule objects are disposed.
- Editor change clears stale validated results.

## Graph and intent

- Atom count is available.
- Bond count is available.
- Connected-component count is available.
- Isolated atoms count as components.
- Four isolated carbons are not accepted as one molecule.
- Linear C4 returns A=4, B=3, C=1.
- Ionic/mixture multi-component exceptions are configured explicitly.

## Chemistry output

- Formula/mass are shown only after applicable policy and validation pass.
- Canonical structure is derived from RDKit.
- Warnings are not hidden.
- Stereochemistry limitations are disclosed.
- Angle values identify whether they are ideal, generated, or reference values.
