# TDD Draft — Technical Design for Molecule Modeling Workbench

## 1. Architecture Summary

MVP should be frontend-first.

```text
React/Vite App
 ├─ Ketcher Editor Component
 ├─ Structure State Service
 ├─ RDKit Validation Service
 ├─ Molecule Result Panel
 ├─ Export Service
 └─ Example Molecule Library
```

Optional later:

```text
FastAPI Backend
 ├─ RDKit Python advanced validation
 ├─ Open Babel file conversion
 └─ PubChem proxy/cache
```

## 2. Data Flow

1. User draws molecule in Ketcher.
2. App requests SMILES and MOL block from Ketcher.
3. Ketcher output is normalized into `MoleculeInput` with `validationStatus: 'unvalidated'`.
4. RDKit.js receives only `MoleculeInput.molBlock` or `MoleculeInput.smiles`; when both exist, the current service validates the MOL block first because it preserves the editor-exported structure more directly.
5. `src/services/rdkitService.ts` initializes RDKit.js once, creates an RDKit molecule object with `get_mol(...)`, checks `is_valid()`, and disposes the molecule object with `delete()` after validation.
6. Validation service returns `MoleculeValidationResult`:
   - parse status
   - canonical SMILES
   - molecular formula
   - average molecular weight from RDKit descriptor `amw`, not exact mass
   - warnings
   - student-facing failure message
   - developer logs for diagnostics
7. UI displays formula, average molecular weight, and canonical SMILES only when `validationStatus: 'valid'` and `ok: true`.
8. If validation fails, the student panel shows only a classroom-facing correction message and hides formula, average molecular weight, canonical SMILES, and raw invalid structure strings.
9. 3Dmol.js receives a `MoleculeRenderState` only after validation passes; it does not validate chemistry.
10. Export service generates image output from the current validated or explicitly unvalidated drawing state, depending on export type.

## 3. Core Interfaces

```ts
export type MoleculeValidationStatus =
  | 'unvalidated'
  | 'validating'
  | 'valid'
  | 'invalid'
  | 'error';

export type MoleculeInput = {
  source: 'ketcher' | 'example' | 'import';
  validationStatus: MoleculeValidationStatus;
  smiles?: string;
  molBlock?: string;
  label?: string;
};

export type MoleculeValidationResult =
  | {
      ok: true;
      validationStatus: 'valid';
      source: 'smiles' | 'mol-block';
      smiles?: string;
      molBlock?: string;
      canonicalSmiles: string;
      molecularFormula: string;
      molecularWeight: number;
      studentMessage?: never;
      warnings: string[];
      errors: string[];
      developerLogs: string[];
    }
  | {
      ok: false;
      validationStatus: 'invalid' | 'error';
      source?: 'smiles' | 'mol-block';
      studentMessage: string;
      warnings: string[];
      errors: string[];
      developerLogs: string[];
    };

export type MoleculeRenderState = {
  validationStatus: MoleculeValidationStatus;
  smiles?: string;
  molBlock?: string;
  molecularFormula?: string;
  molecularWeight?: number;
  editor: {
    provider: 'ketcher';
    status: 'not-loaded' | 'loading' | 'ready' | 'error';
  };
  structure3d: {
    provider: '3dmol';
    status: 'not-requested' | 'waiting-for-validation' | 'ready' | 'blocked' | 'error';
  };
};
```

The canonical TypeScript source for these contracts is `apps/workbench/src/types/molecule.ts`.

## 4. Validation Gates

- Gate 1: Ketcher editor loaded.
- Gate 2: structure extraction returns non-empty machine-readable data.
- Gate 3: RDKit parses molecule.
- Gate 4: calculated outputs are derived from RDKit-parsed molecule.
- Gate 5: invalid or errored validation results do not populate the student-facing formula, average molecular weight, or canonical SMILES fields.
- Gate 6: 3Dmol.js receives only validated structure state and does not compute validation.
- Gate 7: export uses current validated structure for chemistry-bearing export, while worksheet image export may use the visible editor drawing with an explicit validation label.

## 5. Initial Dependencies

- `react`
- `vite`
- `typescript`
- Ketcher package or embedded build, depending on compatibility
- `@rdkit/rdkit` or official RDKit.js package path confirmed at implementation time
- 3Dmol.js only after 2D validation is stable
- `vitest`
- `playwright`

## 6. Testing Strategy

### Unit tests

- Example molecule list validates expected SMILES.
- Validation service handles valid and invalid input.
- Formula/mass display is blocked when validation fails.
- RDKit initialization is reused across repeated validation calls.
- MOL block validation works and is preferred over SMILES when both are available.

### Integration tests

- Ketcher component loads.
- Example molecule can be loaded into editor and extracted back.
- RDKit service initializes once and handles repeated calls.

### E2E tests

- Load ethanol example → see formula/mass.
- Draw or load benzene → export image.
- Invalid structure → warning appears and no confident calculation is shown.

## 7. Risk Register

| Risk | Mitigation |
|---|---|
| Ketcher package integration complexity | Start with minimal embedding spike. |
| RDKit.js WASM loading issues | Create dedicated loader service and test it early. |
| 2D-to-3D conversion is not trivial | Treat 3D viewer as Phase 2; use known examples first. |
| Licensing ambiguity | Keep dependency decision log. |
| Students misinterpret generated 3D geometry | Add method/source label to viewer. |
