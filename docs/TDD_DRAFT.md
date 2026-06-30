# TDD Draft — Technical Design for Molecule Modeling Workbench

## 1. Architecture Summary

MVP should be frontend-first.

```text
React/Vite App
 ├─ Ketcher Editor Component
 ├─ Structure State Service
 ├─ RDKit Validation Service
 ├─ Molecule Result Panel
 ├─ 3Dmol.js Viewer Shell
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
10. Current 3D Viewer Shell does not generate coordinates from SMILES, does not treat Ketcher 2D MOL blocks as 3D data, and does not call PubChem, Open Babel, or RDKit conformer generation.
11. Static 3D example coordinates may be attached to selected local example records as `structure3D`.
12. Example loading keeps the existing validation flow:
   - Ketcher receives the example SMILES.
   - RDKit.js validates the extracted Ketcher structure and provides formula, average molecular weight, and canonical SMILES.
   - If RDKit validation succeeds and the selected example has `structure3D`, 3Dmol.js receives only that coordinate-bearing data.
   - If the selected example has no `structure3D`, the viewer keeps the student message `3D 좌표 데이터가 아직 없습니다`.
13. 3Dmol.js visualizes coordinate data only; it is not the source for formula, mass, or validation status.
14. If a later import or trusted example provides coordinate-bearing `mol`, `sdf`, `xyz`, or `pdb` data, the viewer can clear the previous model, load the coordinate data, resize, and render it with a source/method label.
15. Export service generates image output from the current validated or explicitly unvalidated drawing state, depending on export type.

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

export type Molecule3DInput = {
  format: 'mol' | 'sdf' | 'xyz' | 'pdb';
  data: string;
  label: string;
  sourceType: 'static-example' | 'pubchem' | 'user-import' | 'review-needed';
  coordinateSource: string;
  sourceNote?: string;
  sourceUrl?: string;
};

export type ExampleMolecule3DStructure = {
  format: 'mol' | 'sdf' | 'xyz' | 'pdb';
  data: string;
  sourceType: 'static-example' | 'pubchem' | 'user-import' | 'review-needed';
  sourceNote: string;
  sourceUrl?: string;
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
- Gate 6: 3Dmol.js receives only validated structure state plus explicit coordinate-bearing 3D data and does not compute validation.
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
- 3D Viewer Shell renders the student-facing no-coordinate message when only SMILES/2D MOL data is available.
- 3D Viewer Shell labels coordinate source and input format when coordinate-bearing data is supplied.
- Static 3D examples are limited to explicitly curated local records and do not mutate RDKit formula/mass output.

### Integration tests

- Ketcher component loads.
- Example molecule can be loaded into editor and extracted back.
- RDKit service initializes once and handles repeated calls.

### E2E tests

- Load ethanol example → see formula/mass.
- Draw or load benzene → export image.
- Invalid structure → warning appears and no confident calculation is shown.

## 7. Future PubChem 3D Data Flow

This section is design-only. No PubChem API call is implemented in the current phase.

### Intended flow

```text
Ketcher structure
  -> RDKit.js validation
  -> canonicalSmiles or explicit example molecule id
  -> PubChem lookup candidate selection
  -> coordinate-bearing 3D record, preferably SDF when available
  -> source/mismatch checks
  -> Molecule3DInput with sourceType: 'pubchem'
  -> 3Dmol.js visualization
```

### Required gates before 3D display

1. RDKit validation must pass for the current Ketcher structure.
2. PubChem lookup must be triggered from a trusted key, such as RDKit canonical SMILES or a curated example ID.
3. The app must handle zero, multiple, or ambiguous PubChem candidates.
4. Returned PubChem structure data must be labeled with source metadata, including source type and URL.
5. If the returned external structure appears inconsistent with the RDKit-validated current molecule, the 3D viewer must remain blocked and the app must request review.
6. Formula and molecular weight remain RDKit.js values; PubChem 3D data is not the calculation source.

### Planned service boundary

The future PubChem integration should be isolated behind a service, for example:

```ts
export type PubChem3DLookupInput = {
  canonicalSmiles?: string;
  exampleId?: string;
  label: string;
};

export type PubChem3DLookupResult =
  | {
      ok: true;
      molecule3D: Molecule3DInput & {
        sourceType: 'pubchem';
        sourceUrl: string;
      };
      developerLogs: string[];
      warnings: string[];
    }
  | {
      ok: false;
      studentMessage: string;
      developerLogs: string[];
      warnings: string[];
    };
```

The service should not call Open Babel, should not generate conformers, and should not modify the RDKit validation result.

### Failure behavior

- No PubChem 3D data: show `이 분자에는 사용할 수 있는 3D 좌표 데이터가 아직 없습니다.`
- Network/API failure: keep the 2D editor and RDKit result visible, and show a student-friendly 3D loading failure message.
- Candidate mismatch: block 3D display and log the mismatch reason for review.

## 8. Risk Register

| Risk | Mitigation |
|---|---|
| Ketcher package integration complexity | Start with minimal embedding spike. |
| RDKit.js WASM loading issues | Create dedicated loader service and test it early. |
| 2D-to-3D conversion is not trivial | Current shell does not generate conformers; add a coordinate source only after a validated import or explicit generation method exists. |
| Licensing ambiguity | Keep dependency decision log. |
| Students misinterpret generated 3D geometry | Add method/source label to viewer. |
