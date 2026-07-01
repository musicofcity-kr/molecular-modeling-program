# TDD Draft — Technical Design for 다양한 분자의 분자구조 모델링

## 1. Architecture Summary

MVP should be frontend-first.

```text
React/Vite App
 ├─ Ketcher Editor Component
 ├─ Structure State Service
 ├─ RDKit Validation Service
 ├─ VSEPR Prediction Engine
 ├─ VSEPR Prediction Model Viewer
 ├─ Molecule Result Panel
 ├─ Activity Panel
 ├─ Teacher Panel
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
17. The app has two independent UI mode axes:
   - `UserMode`: `student` or `teacher`
   - `AppMode`: `free_draw` or `activity`
18. The four supported combinations are:
   - `free_draw + student`: open drawing, validation, VSEPR, 3D, and PubChem candidate review without teacher-only notes or developer logs.
   - `free_draw + teacher`: open drawing plus teacher guidance, current validation status, VSEPR status, 3D/PubChem status, and collapsible developer logs.
   - `activity + student`: guided student activity questions, prediction inputs, RDKit comparison, VSEPR reflection, and 3D/VSEPR model observation.
   - `activity + teacher`: teacher guidance for the selected activity template without automatic scoring or student submission storage.
19. `AppMode` behavior:
   - `free_draw`: default mode for open molecule drawing, RDKit validation, 3D viewer, and PubChem candidate search.
   - `activity`: guided classroom mode that keeps the same editor and validation flow but adds prompts, student predictions, and reflection fields.
20. Activity mode compares student-entered predicted formula and predicted molecular weight against RDKit.js validation results only after `validationResult.ok === true`.
21. Activity comparison is intentionally a simple string comparison. It does not score answers and does not try to normalize chemically equivalent formula notation.
22. Activity templates store prompts, target SMILES, teacher notes, misconception checks, and expected VSEPR guidance for classroom use, but they do not store molecular weight or override RDKit-calculated formula/mass.
23. Teacher-facing guidance is shown only in `UserMode: 'teacher'`; student-facing screens do not show teacher notes, misconception checklists, raw API response details, HTTP status details, or developer logs.
24. This phase does not implement student login, persistence, teacher dashboards, PDF/image export, or automatic grading.
25. VSEPR analysis is a separate educational prediction layer:
   - it runs only after RDKit.js validation succeeds;
   - it reads the validated Ketcher V2000 MOL block as a local atom/bond graph;
   - it does not compute formula, mass, canonical SMILES, energy, real bond lengths, or measured bond angles;
   - it returns center-atom-local AXE notation, electron-domain geometry, molecular shape, idealized angle labels, confidence, and warnings.
26. If a molecule has multiple plausible centers, such as ethanol, the app does not assign one global VSEPR shape. It asks the user to select a center atom and then performs local VSEPR analysis for that atom.
27. If a molecule has one clear center atom and all other heavy atoms are terminal ligands without inferred hydrogens, such as BF3, BeCl2, PCl5, SF4, ClF3, XeF2, SF6, BrF5, or XeF4, the app can auto-select the center atom.
28. Activity mode includes VSEPR prediction prompts, but those student answers are not automatically scored in this phase.
29. VSEPR is not a permanent core panel in default free-draw mode. In free-draw mode, the app shows only an optional VSEPR module gate until the user explicitly opens it.
30. Guided activity mode can show VSEPR analysis and the VSEPR model by default because the activity prompts make the simplified model context explicit.
31. VSEPR prediction model visualization is a separate teaching-model path:
   - `src/services/vseprGeometryTemplates.ts` maps supported AXE notation to unit vectors;
   - vectors are marked as `bond` or `lonePair`;
   - `Vsepr3DModelViewer` renders a center atom, bond directions, bonded atoms, and lone-pair markers;
   - the result is labeled as `VSEPR 예측 모형`, not as PubChem/static coordinate data.
32. VSEPR template lookup accepts Claude-style aliases such as `AX4E0` and `AX3E1`, but the displayed app notation stays compact, such as `AX4` and `AX3E`.
33. If a later import or trusted example provides coordinate-bearing `mol`, `sdf`, `xyz`, or `pdb` data, the actual/external 3D viewer can clear the previous model, load the coordinate data, resize, and render it with a source/method label.
34. The actual/external 3D viewer supports three display styles for coordinate-bearing data: `ball-and-stick`, `stick`, and `space-filling`. The default is `ball-and-stick`.
35. Atom labels can be toggled in the actual/external 3D viewer. Student default labels use element symbols, while teacher mode or active measurement mode uses indexed labels such as `C1` and `H2`.
36. Reset view and zoom-to-fit are viewer controls only. They are enabled only when a validated structure has coordinate-bearing 3D data.
37. Geometry measurement is based only on the currently loaded coordinate-bearing `mol`, `sdf`, `xyz`, or `pdb` data in `Molecule3DViewer`.
38. Bond-length mode requires two selected atoms and reports the atom-to-atom distance in angstrom-like coordinate units.
39. Bond-angle mode requires three selected atoms and uses the second selected atom as the angle center.
40. Geometry measurement is not attached to `Vsepr3DModelViewer` in this phase, because VSEPR vectors are educational unit directions rather than real molecular coordinates.
41. Export service generates image output from the current validated or explicitly unvalidated drawing state, depending on export type.

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
  coordinateDimension: '2d' | '3d' | 'unknown';
  structureMatchStatus?: 'verified' | 'formula-compatible' | 'review-needed';
  coordinateSource: string;
  sourceNote?: string;
  sourceUrl?: string;
};

export type Molecule3DRepresentationMode =
  | 'ball-and-stick'
  | 'stick'
  | 'space-filling';

export type AtomSelectionMode = 'none' | 'bond_length' | 'bond_angle';

export interface SelectedAtom3D {
  atomIndex: number;
  element: string;
  x: number;
  y: number;
  z: number;
}

export interface GeometryMeasurementResult {
  type: 'bond_length' | 'bond_angle';
  atomIndices: number[];
  atomLabels: string[];
  value: number;
  unit: 'angstrom' | 'degree';
  sourceNote: string;
}

export type StructureComparisonAvailability =
  | 'available'
  | 'missing_real_3d'
  | 'missing_vsepr'
  | 'low_confidence_vsepr'
  | 'multi_center_not_recommended'
  | 'rdkit_invalid'
  | 'not_supported';

export interface StructureComparisonState {
  availability: StructureComparisonAvailability;
  real3DSourceLabel: string;
  vseprSourceLabel: string;
  rdkitFormula?: string;
  rdkitCanonicalSmiles?: string;
  real3DStructureAvailable: boolean;
  vseprModelAvailable: boolean;
  warnings: string[];
  studentMessage: string;
  teacherNote?: string;
  recommended: boolean;
}

export interface StructureComparisonObservation {
  moleculeName?: string;
  rdkitFormula?: string;
  real3DSourceLabel: string;
  vseprAxeNotation?: string;
  vseprShapeKo?: string;
  idealBondAngle?: string;
  observedSimilarities: string;
  observedDifferences: string;
  studentReflection: string;
}

export type ExampleMolecule3DStructure = {
  format: 'mol' | 'sdf' | 'xyz' | 'pdb';
  data: string;
  sourceType: 'static-example' | 'pubchem' | 'user-import' | 'review-needed';
  coordinateDimension: '2d' | '3d' | 'unknown';
  structureMatchStatus?: 'verified' | 'formula-compatible' | 'review-needed';
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
  isomericSmiles?: string;
  source: 'pubchem';
}

export type PubChemCandidateSearchResult =
  | {
      ok: true;
      status: 'no_match' | 'single_candidate' | 'multiple_candidates';
      candidates: PubChemCandidate[];
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    }
  | {
      ok: false;
      status: 'error';
      candidates: [];
      studentMessage: string;
      warnings: string[];
      developerLogs: string[];
    };

export type SearchPubChemCandidatesByCanonicalSmiles = (
  canonicalSmiles: string,
) => Promise<PubChemCandidateSearchResult>;

export type AppMode = 'free_draw' | 'activity';
export type UserMode = 'student' | 'teacher';

export interface ActivityQuestion {
  id: string;
  label: string;
  placeholder?: string;
}

export interface ActivityTemplate {
  id: string;
  title: string;
  targetMoleculeName: string;
  targetSmiles?: string;
  learningGoal: string;
  prompt: string;
  predictionQuestions: ActivityQuestion[];
  reflectionQuestions: ActivityQuestion[];
  coreConcepts?: string[];
  teacherNotes?: string[];
  misconceptionChecks?: string[];
  comparisonMode?: {
    enabled: boolean;
    recommended: boolean;
    focusQuestion: string;
    teacherNote?: string;
  };
  expectedVsepr?: {
    axeNotation?: string;
    molecularShapeKo?: string;
    centralAtom?: string;
    lonePairCount?: number;
  };
  recommendedExampleId?: string;
}

export type ActivityResponseState = Record<string, string>;

export type VseprStatus =
  | 'not_requested'
  | 'needs_central_atom'
  | 'supported'
  | 'unsupported'
  | 'error';

export interface VseprAnalysis {
  status: VseprStatus;
  centralAtomId?: string;
  centralAtomSymbol?: string;
  bondedAtomCount?: number;
  lonePairCount?: number;
  stericNumber?: number;
  axeNotation?: string;
  electronDomainGeometryKo?: string;
  molecularShapeKo?: string;
  idealBondAngles?: string[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

export type VseprModelViewStatus =
  | 'not_requested'
  | 'ready'
  | 'rendered'
  | 'unsupported'
  | 'error';

export interface VseprVector {
  x: number;
  y: number;
  z: number;
  kind: 'bond' | 'lonePair';
  label?: string;
}

export interface VseprGeometryTemplate {
  axeNotation: string;
  electronDomainGeometryKo: string;
  molecularShapeKo: string;
  idealBondAngles: string[];
  vectors: VseprVector[];
  note: string;
}

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

The canonical TypeScript sources for these contracts are `apps/workbench/src/types/molecule.ts`, `apps/workbench/src/types/activity.ts`, and `apps/workbench/src/types/vsepr.ts`.

## 4. Validation Gates

- Gate 1: Ketcher editor loaded.
- Gate 2: structure extraction returns non-empty machine-readable data.
- Gate 3: RDKit parses molecule.
- Gate 4: calculated outputs are derived from RDKit-parsed molecule.
- Gate 5: invalid or errored validation results do not populate the student-facing formula, average molecular weight, or canonical SMILES fields.
- Gate 6: 3Dmol.js receives only validated structure state plus explicit coordinate-bearing 3D data and does not compute validation.
- Gate 7: activity mode reads RDKit.js validation results but does not create calculated chemistry values itself.
- Gate 8: activity comparison is shown as `아직 검증 전`, `예상값 입력 전`, `일치`, or `다름`; it is not an automatic score.
- Gate 9: VSEPR analysis reads MOL block data only after RDKit.js validation succeeds.
- Gate 10: VSEPR results are labeled as educational predictions, not measured geometry, optimized conformers, or 3D coordinate data.
- Gate 11: multi-center molecules require center-atom selection and are not described as one whole-molecule VSEPR shape.
- Gate 12: VSEPR 3D model visualization uses only explicit AXE template vectors and is labeled as an educational prediction model, not real coordinate data.
- Gate 13: student mode hides teacher-only notes and developer logs; teacher mode shows them as guidance and diagnostics, not as scoring output.
- Gate 14: actual/external 3D viewer controls and geometry measurement are enabled only for RDKit-validated, coordinate-bearing 3D data.
- Gate 15: measured distances and angles must state their coordinate source and must not be described as experimental values, optimized conformers, or VSEPR results.
- Gate 16: comparison mode is enabled only when RDKit.js validation succeeds, actual/external 3D coordinate data is loaded, and VSEPR analysis is supported with medium or high confidence.
- Gate 17: comparison mode must not treat VSEPR model vectors as measured PubChem/static 3D geometry, and it must not overwrite RDKit.js formula or canonical SMILES.
- Gate 18: export uses current validated structure for chemistry-bearing export, while worksheet image export may use the visible editor drawing with an explicit validation label.

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
- PubChem candidate search service maps manual canonical SMILES search results to external data candidates without auto-selecting a candidate.
- PubChem candidate panel renders candidates as `외부 데이터 후보` and keeps PubChem formula/mass as auxiliary metadata only.
- Selecting a candidate reuses the CID-based 3D SDF loading service instead of creating a second 3D fetch path.
- Activity templates include only classroom prompts, target molecule references, and prediction/reflection questions.
- Activity panel compares student predictions with RDKit.js formula and average molecular weight by simple string match.
- VSEPR engine parses V2000 MOL blocks, maps AXE notation, handles implicit hydrogens for simple main-group examples, and blocks unsupported cases.
- VSEPR panel shows blocked, center-selection, supported, unsupported, and error states without claiming experimental geometry.
- 3D measurement service parses coordinate-bearing SDF/MOL/XYZ/PDB atoms into stable 1-based atom labels.
- 3D measurement service calculates distances from two selected coordinate atoms.
- 3D measurement service calculates angles from three selected coordinate atoms with the second selection as the center.
- Molecule3DViewer renders representation controls, atom-label toggle, reset/zoom controls, and measurement controls without enabling them when coordinate data is missing.
- Structure comparison service returns `available` only when RDKit validation, actual/external 3D coordinates, and VSEPR template availability all pass.
- Structure comparison service blocks low-confidence VSEPR output and multi-center/caution molecules from one-whole-molecule comparison.
- Structure comparison panel hides teacher-only guidance in student mode and labels the actual/external 3D viewer separately from the VSEPR prediction viewer.

### Integration tests

- Ketcher component loads.
- Example molecule can be loaded into editor and extracted back.
- RDKit service initializes once and handles repeated calls.
- Switching from `free_draw` to `activity` reveals the activity panel without removing the editor, validation panel, 3D viewer, or PubChem candidate panel.
- Loading a validated example updates the VSEPR panel while keeping RDKit formula/mass as the source for calculated values.

### E2E tests

- Load ethanol example → see formula/mass.
- Draw or load benzene → export image.
- Invalid structure → warning appears and no confident calculation is shown.
- Activity mode: enter a predicted formula, validate a structure, and confirm the panel shows match/different without score output.
- VSEPR mode: load water or methane and confirm AXE notation appears; load ethanol and confirm center-atom selection is required.
- 3D viewer mode: load a coordinate-bearing example, change representation mode, toggle labels, reset/zoom the view, measure a two-atom distance, and measure a three-atom angle.
- No-coordinate mode: load a molecule without static/PubChem/imported 3D coordinates and confirm representation and measurement controls stay disabled.

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

## 8. Manual PubChem Candidate Search Flow

This phase implements a manual candidate search prototype. User-drawn structures are not searched automatically; PubChem is called only when the user clicks `PubChem 후보 검색` after RDKit.js validation succeeds.

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
   - requires the user to explicitly request candidate search with `PubChem 후보 검색`;
   - presents PubChem results as `외부 데이터 후보`;
   - requires user review before CID-based 3D loading.

The matching flow must not automatically select a PubChem candidate, even when only one candidate is returned. A single candidate is still external data that needs user confirmation.

### Intended flow

```text
Ketcher structure
  -> RDKit.js validation
  -> RDKit.js canonicalSmiles
  -> user explicitly requests PubChem candidate search
  -> PubChem returns 0, 1, or multiple external data candidates
  -> user reviews and confirms a candidate
  -> app reuses fetchPubChem3DSdf(candidate.cid)
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

PubChem candidate search is isolated behind `src/services/pubchemSearch.ts`:

```ts
searchPubChemCandidatesByCanonicalSmiles(
  canonicalSmiles: string,
): Promise<PubChemCandidateSearchResult>;
```

Candidate search and CID-based 3D SDF loading remain separate services. Candidate search identifies possible PubChem CIDs; CID-based 3D loading fetches coordinate-bearing data only after a candidate is confirmed. Candidate selection uses the existing `fetchPubChem3DSdf(...)` path.

The service does not call Open Babel, does not generate conformers, and does not modify the RDKit validation result.

### Failure behavior

- No PubChem 3D data: show `이 분자에는 사용할 수 있는 3D 좌표 데이터가 아직 없습니다.`
- Network/API failure: keep the 2D editor and RDKit result visible, and show a student-friendly 3D loading failure message.
- Candidate mismatch: block 3D display and log the mismatch reason for review.
- Candidate search returns zero results: show that no external data candidate was found.
- Candidate search returns multiple results: require user review instead of selecting one automatically.
- Candidate search HTTP/network error: keep RDKit.js formula, average molecular weight, and canonical SMILES visible; show a short student message and log endpoint type, canonical SMILES, HTTP status, response excerpt, or error message for developers.

## 9. Classroom Activity Mode MVP

This phase adds a classroom workflow layer without changing the chemistry validation source.

### Mode boundary

- `free_draw` keeps the existing open drawing flow: Ketcher input, RDKit.js validation, structure information panel, PubChem candidate search, and 3Dmol.js visualization.
- `activity` keeps the same Ketcher/RDKit/PubChem/3Dmol.js flow and adds a guided activity panel.
- The mode switch does not reset the molecule editor, RDKit validation result, PubChem candidate result, or 3D viewer state.
- `student` and `teacher` are separate from `free_draw` and `activity`; switching the user mode does not reset chemistry state.

### Activity template structure

Activity templates live in `apps/workbench/src/data/activityTemplates.ts`.

```ts
export interface ActivityTemplate {
  id: string;
  title: string;
  targetMoleculeName: string;
  targetSmiles?: string;
  learningGoal: string;
  prompt: string;
  predictionQuestions: ActivityQuestion[];
  reflectionQuestions: ActivityQuestion[];
  coreConcepts?: string[];
  teacherNotes?: string[];
  misconceptionChecks?: string[];
  comparisonMode?: {
    enabled: boolean;
    recommended: boolean;
    focusQuestion: string;
    teacherNote?: string;
  };
  expectedVsepr?: {
    axeNotation?: string;
    molecularShapeKo?: string;
    centralAtom?: string;
    lonePairCount?: number;
  };
  recommendedExampleId?: string;
}
```

The initial MVP templates are:

- `draw-water`: 물 분자 구조 그리기
- `draw-methane`: 메테인 분자 구조 그리기
- `draw-ammonia`: 암모니아 분자 구조 그리기
- `draw-carbon-dioxide`: 이산화탄소 분자 구조 그리기
- `draw-ethanol`: 에탄올 분자 구조 그리기
- `draw-benzene`: 벤젠 분자 구조 그리기

### Prediction comparison flow

```text
Student selects activity
  -> student enters predicted formula and predicted molecular weight
  -> student draws or loads a molecule in Ketcher
  -> existing RDKit.js validation runs
  -> ActivityPanel reads validationResult
  -> simple string comparison is displayed
```

Comparison statuses:

- `아직 검증 전`: RDKit.js has not produced a valid result.
- `예상값 입력 전`: RDKit.js has a valid result, but the student left that prediction blank.
- `일치`: the trimmed student string exactly matches the displayed RDKit.js value.
- `다름`: the strings do not match.

The comparison is not a grade. It does not normalize formula order, significant figures, aliases, PubChem values, or chemically equivalent notation.

### Explicit non-goals for this phase

- No student login.
- No database or Firebase persistence.
- No teacher dashboard.
- No automatic scoring.
- No activity result PDF/image export.

## 10. Student/Teacher Mode Split MVP

This phase separates classroom UI roles without adding authentication, persistence, or dashboards.

### UserMode boundary

```ts
export type UserMode = 'student' | 'teacher';
```

- `student`: inquiry and response entry. Shows activity selection, learning goal, Ketcher editor, RDKit validation result, VSEPR analysis, actual/external 3D viewer, VSEPR model viewer, PubChem candidate review, prediction inputs, comparison display, and reflection inputs.
- `teacher`: activity guidance and diagnostic reference. Shows selected activity template details, learning goal, core concepts, expected formula from the recommended example metadata, expected VSEPR guidance, question lists, student input checklist, RDKit/VSEPR/3D/PubChem status, misconception checks, and collapsible developer logs.

### TeacherPanel boundary

`apps/workbench/src/components/TeacherPanel.tsx` is a read-only classroom guidance panel.

It must not:

- score student responses;
- store student responses;
- show student submission lists;
- authenticate teachers;
- call Firebase or a database;
- replace RDKit.js formula or molecular-weight output.

### Developer log boundary

- Student mode hides the developer log panel.
- Teacher mode shows `개발자 로그 / 검증 결과` behind a `개발자 로그 보기` toggle.
- Developer logs remain diagnostics. They are not student-facing explanations and are not assessment results.

## 11. VSEPR Prediction Engine MVP

The VSEPR engine is an educational structure-prediction layer. It is not part of RDKit.js validation, PubChem lookup, or 3Dmol.js coordinate rendering.

### Data flow

```text
Ketcher V2000 MOL block
  -> RDKit.js validation succeeds
  -> VSEPR engine parses local atom/bond graph
  -> app selects one clear center or asks user to select a center atom
  -> VSEPR panel displays AXE notation and idealized classroom geometry
```

### Service boundary

`apps/workbench/src/services/vseprEngine.ts` is a pure TypeScript service:

- parses V2000 atom and bond blocks;
- reads atom charge codes and `M  CHG` lines where present;
- treats single, double, triple, and aromatic bonds as one VSEPR electron-domain direction for geometry counting;
- estimates implicit hydrogens only from a small common-valence table;
- estimates lone pairs with:

```text
lonePairs = (valenceElectrons - sumBondOrder - formalCharge) / 2
```

If the estimate is negative, non-integer, or outside the MVP mapping table, the result is `unsupported`.

### Supported MVP centers

- High-confidence main-group centers: Be, B, C, N, O, F, P, S, Cl.
- Lower-confidence centers when simple enough: Br, I, Xe.
- Unsupported or review-needed: transition metals, radicals, malformed MOL blocks, unsupported bond/query types, complex resonance-heavy cases, and steric numbers outside the mapping table.

### Supported AXE mappings

- AX2: 선형
- AX3: 삼각 평면
- AX2E: 굽은형
- AX4: 정사면체
- AX3E: 삼각뿔형
- AX2E2: 굽은형
- AX5: 삼각쌍뿔
- AX4E: 시소형
- AX3E2: T자형
- AX2E3: 선형
- AX6: 팔면체
- AX5E: 사각뿔형
- AX4E2: 사각평면형

### UI behavior

- Before RDKit validation: show a blocked VSEPR state.
- Single clear center: auto-display local VSEPR result.
- Multiple centers: show center atom dropdown.
- Unsupported center: hide confident geometry and show review-needed warnings.
- In default free-draw mode, keep the VSEPR panel and VSEPR 3D model viewer hidden behind `VSEPR 예측 모듈 열기`.
- In guided activity mode, show the VSEPR module only when the selected activity template has `requiresVsepr: true`.
- The VSEPR panel can enable `VSEPR 모형 보기` only when the analysis is `supported` and an AXE template exists.
- 3Dmol.js is not used to generate or validate VSEPR geometry; it only draws explicit teaching-model vectors.

### Activity mode additions

The guided activity panel now asks students to predict:

- center atom;
- bonding electron-domain count;
- lone-pair count;
- VSEPR molecular shape;
- how 2D connectivity differs from VSEPR structure prediction.
- how electron domains are arranged in the VSEPR model;
- how lone pairs influence molecular shape;
- how a VSEPR prediction model differs from an actual 3D coordinate source such as PubChem.

These answers are reflection prompts only. They are not automatically scored.

## 12. VSEPR Prediction Model 3D Visualization MVP

This phase adds an explicit VSEPR teaching-model viewer. It does not create a real conformer and does not convert 2D MOL blocks into 3D molecular coordinates.

### Data flow

```text
RDKit.js validation succeeds
  -> VSEPR engine returns supported AXE notation
  -> user clicks VSEPR 모형 보기
  -> vseprGeometryTemplates returns educational unit vectors
  -> Vsepr3DModelViewer renders center atom, bonded directions, and lone-pair markers
```

### Supported templates

The first supported visualization set is:

- AX2: 선형
- AX3: 삼각 평면
- AX2E: 굽은형
- AX4: 정사면체
- AX3E: 삼각뿔형
- AX2E2: 굽은형

Extended templates are also defined for classroom expansion:

- AX5, AX4E, AX3E2, AX2E3
- AX6, AX5E, AX4E2

### Viewer separation

- `Molecule3DViewer` is labeled as `실제/외부 3D 구조 Viewer` and displays coordinate-bearing static, PubChem, or imported data.
- `Vsepr3DModelViewer` is labeled as `VSEPR 예측 모형` and displays idealized AXE template vectors.
- VSEPR model vectors are unit directions only. They are not bond lengths, measured angles, optimized coordinates, PubChem data, or RDKit conformers.
- Lone-pair markers are visual aids for electron-pair direction, not particles.

### Student-facing boundaries

The VSEPR viewer must show that:

- the model is an educational prediction;
- actual molecules can differ from the idealized model;
- ideal bond-angle labels are classroom approximations;
- RDKit.js remains the formula and molecular-weight source;
- PubChem/static coordinate data, when shown, is a separate 3D source.

## 13. Stabilization Notes — 3D Availability Pipeline

The current stabilization keeps the main classroom data path focused on:

```text
Ketcher 2D input
  -> RDKit.js validation
  -> RDKit formula / average molecular weight / canonical SMILES
  -> optional PubChem candidate search or curated CID lookup
  -> source-labeled 3Dmol.js coordinate visualization
```

VSEPR remains a separate optional classroom module:

- `free_draw + student`: full VSEPR panel/model viewer hidden by default;
- `free_draw + teacher`: teacher diagnostics may show VSEPR status;
- `activity + student`: VSEPR visible only when `ActivityTemplate.requiresVsepr` is `true`;
- `activity + teacher`: expected VSEPR data is teacher guidance only.

PubChem 3D loading now has two additional guards:

- candidate formulas are compared compositionally with the current RDKit.js
  formula before CID-based 3D SDF loading;
- stale PubChem candidate or 3D SDF responses are ignored when the validated
  structure changes while a request is in flight.

Generated screenshots, `.test_runs/`, MP4 review videos, and external VSEPR
reference prototypes are not part of the production app commit surface. Their
findings should be recorded in docs instead.

## 14. Phase 10 — 3D Viewer Representation and Measurement MVP

This phase adds classroom-facing controls to the actual/external 3D coordinate viewer without changing the chemistry validation source.

### Representation controls

- `Molecule3DViewer` supports `ball-and-stick`, `stick`, and `space-filling`.
- `ball-and-stick` is the default.
- The controls are disabled until the current structure has passed RDKit.js validation and coordinate-bearing 3D data is available.
- Representation changes call 3Dmol.js style updates only; they do not change RDKit.js validation output, PubChem metadata, or source coordinates.

### Atom labels

- Atom labels are optional.
- In student mode with no active measurement mode, labels use element symbols such as `C` and `H`.
- In teacher mode or measurement mode, labels include stable parsed atom indices such as `C1` and `H2`.
- Labels are derived from the currently loaded 3D coordinate payload, not from Ketcher 2D coordinates or VSEPR template vectors.

### Measurement flow

```text
coordinate-bearing 3D data
  -> parse atom coordinates from SDF/MOL/XYZ/PDB
  -> user selects bond-length or bond-angle mode
  -> user clicks atoms in the 3D viewer
  -> service calculates distance or angle from current coordinates
  -> UI displays value with coordinate-source warning
```

Measurement is intentionally scoped:

- Distance mode uses two selected atoms.
- Angle mode uses three selected atoms, and the second atom is the center.
- Results use the loaded coordinate units as angstrom-like molecular coordinates.
- Results are classroom visualization measurements, not experimental bond lengths, optimized conformer geometry, or VSEPR-derived values.
- VSEPR model measurement is explicitly out of scope in this phase.

### Disabled states

Controls remain disabled when:

- there is no 3D coordinate data;
- RDKit.js validation has not passed;
- the 3D viewer is still loading or failed to initialize;
- the coordinate payload cannot be parsed into atom positions.

## 15. Phase 13 — Actual/External 3D vs VSEPR Comparison Mode

This phase adds a classroom comparison mode that places the actual/external 3D coordinate viewer beside the VSEPR educational prediction model.

### Data flow

```text
Ketcher 2D input
  -> RDKit.js validation
  -> actual/external 3D coordinate data loaded from static example or PubChem SDF
  -> VSEPR engine returns supported AXE prediction with medium/high confidence
  -> buildStructureComparisonState(...)
  -> StructureComparisonPanel displays both viewers and observation prompts
```

### Availability rules

Comparison mode can be opened only when:

- RDKit.js validation succeeds;
- actual/external `Molecule3DInput.coordinateDimension` is `3d`;
- PubChem 3D coordinate data is `structureMatchStatus: 'verified'` before it is used for comparison;
- VSEPR analysis is `supported`;
- a VSEPR geometry template exists;
- VSEPR confidence is not `low`;
- the molecule is not flagged as a multi-center or caution example.

The disabled states are:

- `rdkit_invalid`
- `missing_real_3d`
- `missing_vsepr`
- `low_confidence_vsepr`
- `multi_center_not_recommended`
- `not_supported`

### UI separation

- Left viewer title: `실제/외부 3D 좌표 기반 구조`.
- Right viewer title: `VSEPR 교육용 예측 모형`.
- `Molecule3DViewer` keeps source-labeled coordinate visualization and coordinate-based measurement tools.
- `Vsepr3DModelViewer` keeps idealized AXE vectors and does not gain measurement tools in this phase.
- The shared warning is that two screens come from different sources and can look similar while meaning different things.

### Classroom scope

Recommended comparison molecules:

- 물 H2O
- 메테인 CH4
- 암모니아 NH3
- 이산화탄소 CO2

Conditional comparison molecules only when example data, 3D coordinates, and VSEPR support are prepared:

- BF3
- PCl5
- SF6
- XeF4

Caution or not recommended for one-whole-molecule comparison:

- 에탄올
- 벤젠
- 아스피린
- 포도당
- 복잡한 유기분자
- 전이금속 착물
- 라디칼
- 공명 구조가 중요한 분자

Comparison observations are student reflection fields. They are not automatically scored and are not string-compared against a stored answer.
PubChem candidates that are only formula-compatible may still be reviewed as external 3D visualization data, but they do not open comparison mode until the structure match is verified.

## 16. Phase 15 — Activity Result Save and Export MVP

This phase prepares the Classroom MVP Release Candidate by adding local activity-result snapshots and lightweight export formats.

### Data flow

```text
Ketcher input
  -> RDKit.js validation result
  -> optional actual/external 3D coordinate observation and measurements
  -> optional VSEPR educational prediction
  -> optional actual/external 3D vs VSEPR comparison observation
  -> ActivityResultSnapshot
  -> localStorage / JSON / Markdown / TXT / clipboard / browser print
```

`ActivityResultSnapshot` lives in `apps/workbench/src/types/activityResult.ts`.
The snapshot is a classroom record, not a chemistry validation source. It stores
student predictions, RDKit.js validation output, source-labeled 3D observation
metadata, coordinate-based measurement results, optional VSEPR summary,
comparison observations, activity answers, after-validation reflection, and
final reflection.

### Storage boundary

- `apps/workbench/src/services/activityResultStorage.ts` stores snapshots in
  `localStorage` under `molecule-workbench-activity-results`.
- The app keeps only the latest local snapshots, currently capped at 10.
- This is browser-local temporary storage. It is not a database, not Firebase,
  not a student account, and not a teacher submission list.
- Storage failures return a student-facing message and developer logs without
  changing RDKit.js validation state.

### Export boundary

`apps/workbench/src/services/activityResultExport.ts` supports:

- JSON export of `ActivityResultSnapshot`
- Markdown export for classroom submission
- TXT export
- Markdown clipboard copy
- browser print through `window.print()`

Default exports intentionally exclude:

- developer logs
- raw PubChem responses
- HTTP status details
- raw SDF payloads
- raw MOL blocks
- raw Ketcher editor state

### Validation gates

- RDKit.js remains the source for formula, average molecular weight, and
  canonical SMILES in exported records.
- PubChem/static 3D data contributes only coordinate source and observation
  context.
- 3D measurements are exported only as values from the currently loaded
  coordinate-bearing 3D payload with a source note.
- VSEPR is exported only as an educational prediction summary.
- Export and local save must not make an invalid structure valid and must not
  hide RDKit validation failure messages.

### UI boundary

`ActivityResultPanel` is attached as an `App` sibling panel rather than being
embedded into `ActivityPanel`, `Molecule3DViewer`, or `StructureComparisonPanel`.
This keeps save/export orchestration separate from drawing, validation,
visualization, and comparison responsibilities.

Student mode shows local save/export controls and a classroom result summary.
Teacher mode adds guidance that the output is not automatic scoring and lists
what the export includes/excludes. Developer logs remain outside the exported
student result.

## 17. Student Activity Flow Simplification

The default user experience is now the student activity flow, not the open
toolbox view.

```text
student + activity
  -> activity selection
  -> prediction entry
  -> molecule drawing or example load
  -> structure confirmation
  -> validated result cards
  -> 3D / shape prediction observation
  -> reflection and result save/report/print
```

### Student-facing defaults

- The entry screen uses `AppMode: 'activity'` and `UserMode: 'student'`.
- The main validation action is labeled `내 구조 확인하기`.
- The example load action is labeled `분자 예시 불러오기`.
- The optional shape model action is labeled `예상 입체 모형 보기`.
- Student result/export actions are limited to `임시 저장하기`,
  `보고서로 저장하기`, and `활동지 인쇄하기`.
- Student result cards show classroom-facing values: structure status, formula,
  average molecular weight, shape prediction, and reference 3D availability.
- Raw structure strings, canonical SMILES, PubChem candidate search, individual
  JSON/Markdown/TXT export buttons, and developer logs stay in teacher/advanced
  views.
- The default student body text must not expose `RDKit.js`, `Ketcher`,
  `PubChem`, `CID`, `SDF`, `SMILES`, `MOL`, `JSON`, `localStorage`,
  `Developer log`, or `개발자 로그`.

### Validation/data-flow invariants

- Ketcher remains the 2D structure input layer.
- RDKit.js remains the validation and formula/average-mass calculation layer.
- 3Dmol.js remains the coordinate visualization layer.
- PubChem remains a manual external 3D coordinate source and is not searched
  automatically from student drawings.
- Hiding advanced fields must not remove validation gates or replace RDKit.js as
  the calculation source.

### Test coverage

- `App.test.tsx` checks the default student flow, required classroom action
  labels, and hidden implementation terms.
- `ActivityResultPanel.test.tsx` checks that student mode shows only simplified
  save/report/print actions while teacher mode still exposes raw/report/text
  export.
- `Molecule3DViewer.test.tsx` checks that student mode hides advanced
  source/debug details by default, can expose coordinate measurement controls
  when a validated 3D coordinate payload is loaded, and keeps teacher/advanced
  controls available in teacher mode.

## 17.1 Student 3D Availability Stabilization

The student-facing 3D path now distinguishes three cases:

```text
validated example with static 3D data
  -> keep the example 3D coordinate payload
  -> show the 3D viewer
  -> allow coordinate-based bond length / bond angle measurement

validated user-drawn structure without coordinates
  -> do not invent 3D coordinates from SMILES or 2D MOL
  -> show a student-facing external 3D data search action
  -> require the student to select a returned candidate before loading 3D SDF

same structure confirmed again
  -> keep the existing 3D payload when canonical structure key is unchanged
  -> clear the 3D payload when the structure changes
```

### Student free-draw flow

`student + free_draw` now renders the same classroom shell pieces used by the
activity flow:

- molecule drawing step
- structure confirmation result cards
- optional student-facing external 3D data candidate search
- reference 3D viewer
- structure comparison and result export

The app still does not perform hidden PubChem search. Candidate search starts
only after RDKit validation succeeds and the student explicitly clicks the
external 3D data search action. Candidate values remain auxiliary; formula and
average molecular weight remain RDKit validation results.

## 17.2 Firestore Security Rules Design

Server persistence remains disabled until Firebase Auth and Firestore Security
Rules are implemented and tested. The current `localStorage` snapshot flow is
not a permission model and must not be treated as equivalent to server-side
submission storage.

Security design artifacts:

- `docs/FIRESTORE_SECURITY_RULES_DESIGN.md`
- `firebase/firestore.rules`
- `firebase/README.md`
- `apps/workbench/src/services/firebase/firestoreRules.emulator.test.ts`

### Planned identity boundary

```text
student enters class code + classroom nickname
  -> Firebase Anonymous Auth creates an auth UID
  -> trusted joinClassroom endpoint validates the class code
  -> server creates classrooms/{classroomId}/students/{uid}
  -> student may create only their own submitted snapshot

teacher signs in with Firebase Auth
  -> privileged server assigns teacher custom claim
  -> teacher may read assigned classroom submissions
  -> teacher may update only feedback/status fields
```

The student-facing experience can remain "no signup", but Firestore must still
receive an authenticated UID. Direct unauthenticated Firestore writes are not
allowed.

### Firestore data-flow invariants

- Class code validation is not performed by client-only Firestore writes.
- Student membership documents are created by a trusted server endpoint after
  class code validation.
- Classroom root documents contain teacher and join-code metadata, so student
  UI reads only explicit public classroom subdocuments and published activity
  templates.
- Students can create submissions only after membership exists.
- Students cannot update or delete submitted snapshots.
- Teachers cannot modify `studentUid` or the submitted activity snapshot while
  returning feedback.
- Teacher AI feedback is server-mediated and teacher-reviewed; it is not
  automatic scoring.
- Raw developer logs, raw MOL/SDF payloads, API keys, service account data, real
  student names, student numbers, emails, and phone numbers stay out of student
  submission documents.

### Rules test requirements

The next Firebase phase must add emulator-based tests before enabling
production writes. Current command:

```powershell
cd apps/workbench
npm run test:firestore-rules
```

Current automated coverage:

- unauthenticated read/write denial;
- student with no membership denied;
- member student can create own submission only;
- student cannot read another student's submission;
- student cannot write `teacherFeedback` or raw debug fields;
- teacher claim is required for teacher reads;
- teacher access is limited to assigned classrooms;
- teacher feedback update cannot alter the student snapshot;
- direct client membership creation remains denied.

## 18. Risk Register

| Risk | Mitigation |
|---|---|
| Ketcher package integration complexity | Start with minimal embedding spike. |
| RDKit.js WASM loading issues | Create dedicated loader service and test it early. |
| 2D-to-3D conversion is not trivial | Current shell does not generate conformers; add a coordinate source only after a validated import or explicit generation method exists. |
| Licensing ambiguity | Keep dependency decision log. |
| Students misinterpret generated 3D geometry | Add method/source label to viewer. |
| Students treat VSEPR as measured geometry | Label VSEPR output as idealized educational prediction and keep it separate from 3D coordinate sources. |
| Students confuse VSEPR model vectors with external coordinates | Keep `참고 3D 구조 보기` and `예상 입체 모형` as separate panels with different labels and caveats. |
| Teacher guidance leaks into the student screen | Keep `UserMode` gates explicit and test that student mode hides teacher notes and developer logs. |
| Students treat viewer measurements as reference data | Display coordinate source notes and avoid calling values experimental or optimized geometry. |
| Firestore writes are enabled before rules tests pass | Keep repository writes disabled and require Firebase Emulator rules tests before beta persistence. |
| Class code validation is implemented only on the client | Use a trusted joinClassroom endpoint to validate class code and create membership documents. |
