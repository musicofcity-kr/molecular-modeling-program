# 3D Data Policy — Molecule Modeling Workbench

This policy defines how the app may use 3D molecular coordinate data for classroom visualization.

## Core Principle

3Dmol.js is a 3D coordinate viewer, not a 3D structure generator.

The app must not imply that 3Dmol.js can create reliable 3D molecular geometry from SMILES, Ketcher 2D drawings, or 2D MOL blocks. 3Dmol.js may display coordinate-bearing data that the app explicitly provides, such as SDF, MOL with 3D coordinates, XYZ, or PDB.

## Role Separation

### Ketcher

- Ketcher is the 2D structure input and editing layer.
- Ketcher output is treated as unvalidated structure data until RDKit.js parses it.
- Ketcher 2D MOL blocks must not be presented as 3D structures.

### RDKit.js

- RDKit.js is the chemistry validation and calculation layer.
- Student-facing molecular formula, molecular weight, and canonical SMILES must come from RDKit.js validation results.
- If RDKit.js validation fails, formula, molecular weight, canonical SMILES, and 3D handoff should be blocked.

### 3Dmol.js

- 3Dmol.js is the coordinate visualization layer.
- 3Dmol.js does not validate molecular correctness.
- 3Dmol.js does not provide the authoritative molecular formula or molecular weight.
- 3Dmol.js must receive a source/method label with any displayed coordinate data.

### VSEPR Prediction Model Viewer

- VSEPR prediction models are educational template renderings, not coordinate-bearing molecular structures.
- VSEPR model vectors may be drawn with 3Dmol.js, but they are unit directions for classroom explanation.
- VSEPR model vectors must not be treated as PubChem data, static 3D example data, imported 3D coordinates, or generated conformers.
- Lone-pair markers are visual aids for electron-pair direction, not physical particles.
- Ideal bond-angle labels are approximate VSEPR teaching labels, not measured or optimized geometry.

## Coordinate Data Rules

3D coordinate data is classroom visualization material. It must not be used as the precise basis for:

- bond angle calculation
- bond length calculation
- energy minimization claims
- experimental geometry claims
- stereochemical claims not encoded or validated elsewhere

If the app later adds bond angle or bond length tools, those tools must be designed as a separate validated feature with their own data source policy and tests.

## Source Tracking

Every 3D coordinate payload must carry source metadata:

- `sourceType`: for example `static-example`, `pubchem`, `user-import`, or `review-needed`
- `coordinateSource`: a student-readable source label
- `sourceNote`: a short explanation of what the coordinate data can and cannot mean
- `sourceUrl`: when the data came from an external public source

The UI or validation log must expose enough source information that a teacher can tell whether the 3D view came from an embedded example, PubChem, user import, or a review-needed source.

## Static Example Data

Current static 3D examples are embedded only for a small set of classroom molecules.

Static example coordinates are:

- educational visualization data
- not experimental values
- not generated at runtime from SMILES
- not energy-minimized in this app
- not used for formula or molecular weight

## PubChem 3D Data Policy

PubChem PUG-REST is used in the current prototype for CID-based external 3D coordinate-bearing SDF loading.
Manual candidate search may identify possible PubChem CIDs, but the app must not automatically choose a candidate for the user.

Using PubChem data requires handling these risks:

- PubChem may not have 3D coordinate data for the requested molecule.
- A PubChem search may return multiple candidate compounds.
- The PubChem structure returned for a name, SMILES, or identifier may not match the current Ketcher/RDKit-validated structure.
- PubChem 3D coordinate data is external source data and must be labeled as such.
- Network requests may fail or be unavailable in a classroom.

## PubChem Handoff Gate

PubChem 3D loading must follow this order:

1. Ketcher provides SMILES/MOL data.
2. RDKit.js validates the current structure.
3. The app uses a trusted query key, such as RDKit canonical SMILES or an explicit example molecule ID.
4. PubChem candidate data is requested.
5. Returned data is checked against the current validated structure as far as the frontend can safely do.
6. If the external result is missing, ambiguous, or mismatched, the 3D viewer is blocked and the app asks for review.
7. Only a coordinate-bearing, source-labeled result is passed to 3Dmol.js.

## Failure Message Separation

Student-facing messages should be direct and non-technical.

Examples:

- `이 분자에는 사용할 수 있는 3D 좌표 데이터가 아직 없습니다.`
- `외부 3D 구조를 불러오지 못했습니다. 2D 구조와 검증 결과는 계속 확인할 수 있습니다.`
- `가져온 3D 구조가 현재 검증된 분자와 일치하는지 확인이 필요합니다.`

Developer logs should include enough detail for debugging:

- query key used
- PubChem endpoint or source URL
- HTTP status or fetch error
- candidate identifier, if any
- mismatch reason
- whether 3D display was blocked

## Non-Goals

The current MVP must not implement:

- automatic PubChem matching from user-drawn structures
- automatic selection of a PubChem candidate
- PubChem values replacing RDKit.js formula or molecular weight
- Open Babel backend conversion
- RDKit 3D conformer generation
- SMILES-to-3D automatic generation
- energy minimization
- bond angle calculation
- treating Ketcher 2D MOL blocks as 3D data
- treating VSEPR template vectors as real 3D molecular coordinates

## Sources Checked

- PubChem PUG-REST documentation: https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
- 3Dmol.js documentation: https://3dmol.org/doc/index.html
