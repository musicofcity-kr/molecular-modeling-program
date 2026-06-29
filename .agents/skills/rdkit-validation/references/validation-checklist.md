# Molecule Validation Checklist

- Empty input fails.
- Invalid SMILES fails.
- Valid SMILES succeeds.
- Molfile parsing works or fails with clear error.
- Formula/molecular mass are shown only after success.
- Canonical SMILES is displayed as machine-readable reference.
- Warnings are not hidden.
- RDKit object disposal/cleanup is handled according to the API.
