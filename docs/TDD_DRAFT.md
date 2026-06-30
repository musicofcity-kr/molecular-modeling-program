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
14. PubChem 3D prototype flow is limited to curated example molecules that already contain a `pubchemCid`.
15. PubChem loading does not search by user-drawn SMILES and does not perform automatic compound matching:
   - selected example with `pubchemCid`
   - example is loaded into Ketcher
   - Ketcher output passes RDKit.js validation for the selected example
   - user clicks `PubChem 3D 불러오기`
   - `src/services/pubchem3d.ts` requests CID-based 3D SDF
   - returned SDF is converted only into `Molecule3DInput`
   - 3Dmol.js displays the coordinate-bearing SDF
16. PubChem loading failure does not clear RDKit.js formula, average molecular weight, or canonical SMILES. The student sees a short failure message, while developer logs keep CID, HTTP status, response excerpt, or fetch error.
17. If a later import or trusted example provides coordinate-bearing `mol`, `sdf`, `xyz`, or `pdb` data, the viewer can clear the previous model, load the coordinate data, resize, and render it with a source/method label.
18. Export service generates image output from the current validated or explicitly unvalidated drawing state, depending on export type.

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

export type ExampleMolecule = {
  id: string;
  nameKo: string;
  nameEn: string;
  smiles: string;
  expectedFormula: string;
  teachingUse: string;
  category: '기본 분자' | '유기 기초' | '생활 속 분자';
  pubchemCid?: number;
  pubchemName?: string;
  external3DSource?: 'pubchem' | 'static' | 'none';
  structure3D?: ExampleMolecule3DStructure;
};

export type PubChem3DLookupResult =
  | {
      ok: true;
      status: 'success';
      molecule3D: Molecule3DInput;
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    }
  | {
      ok: false;
      status: 'noData' | 'error';
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    };

export type PubChemMatchStatus =
  | 'not_requested'
  | 'searching'
  | 'no_match'
  | 'single_candidate'
  | 'multiple_candidates'
  | 'error';

export interface PubChemCandidate {
  cid: number;
  title?: string;
  molecularFormula?: string;
  molecularWeight?: string;
  canonicalSmiles?: string;
  source: 'pubchem';
}

export type SearchPubChemCandidatesByCanonicalSmiles = (
  canonicalSmiles: string,
) => Promise<PubChemCandidate[]>;

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
- PubChem 3D service maps successful CID-based SDF responses to `Molecule3DInput` with `sourceType: 'pubchem'`.
- PubChem 3D service separates `noData` and `error` failures and keeps student messages separate from developer logs.
- PubChem 3D UI enables loading only for the currently RDKit-validated selected example with a curated `pubchemCid`.

### Integration tests

- Ketcher component loads.
- Example molecule can be loaded into editor and extracted back.
- RDKit service initializes once and handles repeated calls.

### E2E tests

- Load ethanol example → see formula/mass.
- Draw or load benzene → export image.
- Invalid structure → warning appears and no confident calculation is shown.

## 7. PubChem CID-Based 3D Prototype

This phase implements only a curated CID-based prototype.

```text
Selected example molecule
  -> has curated pubchemCid
  -> user loads example into Ketcher
  -> Ketcher output goes through RDKit.js validation
  -> user clicks PubChem 3D 불러오기
  -> GET /rest/pug/compound/cid/{cid}/record/SDF?record_type=3d
  -> success: SDF becomes Molecule3DInput with sourceType: 'pubchem'
  -> 3Dmol.js visualizes coordinates
```

### Status model

- `idle`: no PubChem request has been made for the current selected example.
- `loading`: CID-based SDF request is in progress.
- `success`: PubChem returned coordinate-bearing SDF and the viewer received it.
- `noData`: PubChem did not return usable 3D SDF for the curated CID.
- `error`: network, HTTP, or parse-level request failure.

### Failure behavior

- Student message: `PubChem에서 이 분자의 3D 구조 데이터를 불러오지 못했습니다. 2D 구조와 분자식 검증 결과는 계속 사용할 수 있습니다.`
- Developer logs include:
  - `PubChem 3D SDF fetch failed`
  - CID
  - HTTP status when available
  - response text excerpt when available
  - fetch error message when available

### Role separation

- Ketcher remains the 2D structure input layer.
- RDKit.js remains the validation and formula/average molecular weight source.
- PubChem SDF is coordinate data only.
- 3Dmol.js visualizes PubChem-provided coordinates only.
- The app does not display PubChem molecular weight, PubChem formula, bond angles, bond lengths, energy, or conformer quality as the student-facing calculation source.

## 8. Future PubChem Search Data Flow

This section remains design-only. User-input SMILES based PubChem search is not implemented in the current phase.

### Separate flows

The app now has two intentionally separate PubChem-related paths:

1. Curated example CID 3D loading:
   - starts from a local example molecule with a known `pubchemCid`;
   - requires the example to pass the existing Ketcher -> RDKit.js validation flow;
   - loads CID-based 3D SDF only after the user clicks `PubChem 3D 불러오기`;
   - does not search or match user-drawn structures.
2. Future user-drawn structure matching:
   - starts from Ketcher output drawn by the user;
   - requires RDKit.js validation first;
   - uses RDKit.js `canonicalSmiles` only as a candidate-search key;
   - requires the user to explicitly request candidate search;
   - presents PubChem results as `외부 데이터 후보`;
   - requires user review before CID-based 3D loading.

The future matching flow must not automatically select a PubChem candidate, even when only one candidate is returned. A single candidate is still external data that needs user confirmation.

### Intended flow

```text
Ketcher structure
  -> RDKit.js validation
  -> RDKit.js canonicalSmiles
  -> user explicitly requests PubChem candidate search
  -> PubChem returns 0, 1, or multiple external data candidates
  -> user reviews and confirms a candidate
  -> app requests coordinate-bearing 3D record, preferably SDF when available
  -> source/mismatch checks
  -> Molecule3DInput with sourceType: 'pubchem'
  -> 3Dmol.js visualization
```

### Required gates before 3D display

1. RDKit validation must pass for the current Ketcher structure.
2. User-drawn structure lookup must be triggered explicitly by the user; validation alone must not trigger PubChem network search.
3. The app must handle zero, multiple, or ambiguous PubChem candidates.
4. Multiple PubChem candidates must not be auto-selected.
5. Returned PubChem candidates must be labeled as `외부 데이터 후보`.
6. Returned PubChem structure data must be labeled with source metadata, including source type and URL.
7. If the returned external structure appears inconsistent with the RDKit-validated current molecule, the 3D viewer must remain blocked and the app must request review.
8. Formula and molecular weight remain RDKit.js values; PubChem 3D data is not the calculation source.

### Planned service boundary

The future PubChem candidate search should be isolated behind a service. This is a type-level design only; no implementation is present in the current phase:

```ts
searchPubChemCandidatesByCanonicalSmiles(
  canonicalSmiles: string,
): Promise<PubChemCandidate[]>;
```

Candidate search and CID-based 3D SDF loading must remain separate services. Candidate search identifies possible PubChem CIDs; CID-based 3D loading fetches coordinate-bearing data only after a candidate is confirmed.

The future service should not call Open Babel, should not generate conformers, and should not modify the RDKit validation result.

### Failure behavior

- No PubChem 3D data: show `이 분자에는 사용할 수 있는 3D 좌표 데이터가 아직 없습니다.`
- Network/API failure: keep the 2D editor and RDKit result visible, and show a student-friendly 3D loading failure message.
- Candidate mismatch: block 3D display and log the mismatch reason for review.
- Candidate search returns zero results: show that no external data candidate was found.
- Candidate search returns multiple results: require user review instead of selecting one automatically.

## 9. Risk Register

| Risk | Mitigation |
|---|---|
| Ketcher package integration complexity | Start with minimal embedding spike. |
| RDKit.js WASM loading issues | Create dedicated loader service and test it early. |
| 2D-to-3D conversion is not trivial | Current shell does not generate conformers; add a coordinate source only after a validated import or explicit generation method exists. |
| Licensing ambiguity | Keep dependency decision log. |
| Students misinterpret generated 3D geometry | Add method/source label to viewer. |
