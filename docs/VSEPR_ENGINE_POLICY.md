# VSEPR Engine Policy

## Purpose

The VSEPR engine is an educational prediction engine for classroom use.
It helps students connect a validated 2D structure to a local center-atom view of electron-domain geometry and molecular shape.

It is not a 3D structure generator, quantum-chemistry calculator, conformer generator, energy minimizer, or experimental geometry source.

## Role Separation

- Ketcher is the 2D structure input layer.
- RDKit.js validates the structure and remains the source for molecular formula, average molecular weight, and canonical SMILES.
- The VSEPR engine predicts idealized center-atom-local geometry from validated 2D bonding information.
- 3Dmol.js visualizes explicit coordinate data or later explicitly labeled VSEPR template models.
- PubChem provides external coordinate-bearing 3D data only when explicitly requested.

VSEPR output must not replace RDKit.js validation output or PubChem/static coordinate-source labels.

## Validation Gate

VSEPR analysis may run only after RDKit.js validation succeeds.

The engine reads the Ketcher-exported V2000 MOL block after validation and parses atom/bond data into a local graph.
It does not infer VSEPR structure from unvalidated SMILES text alone.

## Center Atom Policy

Single-center molecules may be analyzed automatically when one supported center is clear.

Multi-center molecules are handled as local center-atom analyses.
For molecules such as ethanol, the app must not describe the whole molecule as one VSEPR shape.
It must ask the user to choose a center atom and then show the selected atom's local VSEPR result.

## Supported MVP Scope

The MVP supports simple main-group centers:

- C, N, O, F
- P, S, Cl
- Br and I with medium or low confidence when simple enough

Single, double, and triple bonds are each treated as one VSEPR electron-domain direction for shape prediction.
Lone-pair estimates are based on valence electrons, bond-order sum, and formal charge.

## Unsupported Or Low-Confidence Cases

The app should mark these as unsupported, low confidence, or review-needed instead of guessing:

- failed RDKit validation
- missing or malformed MOL block
- V3000/query/R-group structures
- transition-metal centers
- radicals
- complex resonance-heavy structures
- salts or disconnected structures where the chosen center is ambiguous
- negative or non-integer lone-pair estimates
- steric numbers outside the MVP AXE mapping table

## Student-Facing Caveat

Show this idea near VSEPR output:

```text
VSEPR 결과는 전자쌍 반발 이론에 따른 교육용 예측입니다. 실제 측정 구조 또는 계산화학 최적화 구조와 차이가 있을 수 있습니다.
```

## 3D Policy

This MVP prioritizes the VSEPR result panel.
It does not generate actual 3D conformers and does not calculate energy, bond length, or measured bond angle.

Future VSEPR template visualization must be clearly labeled as an idealized teaching model.
Template vectors such as `VseprTemplateGeometry` are not experimental coordinate data.

## Source Note

The MVP follows standard classroom VSEPR assumptions, including the distinction between electron-domain geometry and molecular shape and treating multiple bonds as one electron-domain direction for geometry prediction.
OpenStax Chemistry 2e, Section 7.6, was used as a reference for these classroom VSEPR boundaries.
