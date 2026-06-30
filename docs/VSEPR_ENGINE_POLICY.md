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

- Be, B, C, N, O, F
- P, S, Cl
- Br, I, and Xe with medium or low confidence when simple enough

Single, double, and triple bonds are each treated as one VSEPR electron-domain direction for shape prediction.
Lone-pair estimates are based on valence electrons, bond-order sum, and formal charge.

The implementation also accepts Claude-style notation aliases such as `AX4E0`
and `AX3E1` at template lookup boundaries, but the app's displayed classroom
notation remains compact: `AX4`, `AX3E`, `AX2E2`, and so on.

When one atom is clearly connected to terminal heavy-atom ligands with no
implicit hydrogens, such as BF3, BeCl2, PCl5, SF4, ClF3, XeF2, SF6, BrF5, or
XeF4, the app may auto-select that center atom. Multi-center organic molecules
such as ethanol still require local center-atom selection.

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

Repulsion-energy relaxation demos from external prototypes are not imported
as the production VSEPR engine. The workbench uses deterministic classroom
AXE rules and explicit template vectors so that students do not mistake a
frontend optimization animation for measured or computed molecular geometry.

## Student-Facing Caveat

Show this idea near VSEPR output:

```text
VSEPR 결과는 전자쌍 반발 이론에 따른 교육용 예측입니다. 실제 측정 구조 또는 계산화학 최적화 구조와 차이가 있을 수 있습니다.
```

## 3D Policy

The VSEPR 3D viewer renders an explicitly labeled teaching model from AXE template vectors.
It does not generate actual 3D conformers and does not calculate energy, bond length, or measured bond angle.

Template vectors such as `VseprGeometryTemplate` are not experimental coordinate data.
They are unit directions used to help students compare bonding domains and lone-pair domains around a selected center atom.

The VSEPR model viewer must remain separate from the actual/external 3D structure viewer:

- `실제/외부 3D 구조 Viewer` displays coordinate-bearing static, PubChem, or imported data.
- `VSEPR 예측 모형` displays idealized AXE vectors.
- Lone-pair markers are visual aids, not particles.
- Ideal bond-angle labels are classroom approximations, not measured values.
- The model must not expose bond-length measurements as if they were real molecular distances.

The VSEPR model viewer may use 3Dmol.js only as a rendering layer for these explicit vectors.
It must not imply that 3Dmol.js, RDKit.js, PubChem, or Ketcher generated an optimized VSEPR conformer.

## Comparison Mode Boundary

The actual/external 3D vs VSEPR comparison mode is a classroom observation
workflow, not a chemistry calculation or automatic grading workflow.

Comparison mode may open only when:

- RDKit.js validation succeeds;
- actual/external 3D coordinates are loaded;
- VSEPR analysis is supported;
- VSEPR confidence is medium or high;
- the molecule is suitable for a single-center VSEPR comparison.

The comparison mode must not:

- present VSEPR template vectors as PubChem, static example, imported, or
  experimental coordinates;
- add bond-length or bond-angle measurement tools to the VSEPR viewer;
- describe complex multi-center molecules such as ethanol, benzene, glucose,
  or aspirin as one whole-molecule AXE shape;
- use VSEPR output to replace RDKit.js formula, molecular weight, or canonical
  SMILES.

Recommended classroom comparison targets are water, methane, ammonia, and
carbon dioxide when the actual/external 3D coordinate data is available.
Conditional targets such as BF3, PCl5, SF6, and XeF4 require prepared examples,
3D coordinates, and teacher review.

## Student/Teacher Display Boundary

Student free-draw mode should not show VSEPR as a permanent core panel.
The core free-draw flow is Ketcher input, RDKit.js validation, formula/mass
display, actual/external 3D visualization, and optional PubChem candidate
review.

Student mode may show the current VSEPR analysis, center-atom selection, and
VSEPR prediction model only when:

- the user explicitly opens the optional VSEPR module; or
- the app is in a guided classroom activity whose template has
  `requiresVsepr: true`.

`free_draw + student` keeps the full VSEPR panel and VSEPR 3D model viewer
closed by default. The visible entry point is only an optional classroom-module
gate. `activity + student` shows VSEPR only for activities that explicitly need
the model. This keeps the core free-draw workflow focused on Ketcher input,
RDKit.js validation, and actual/external 3D coordinate visualization.

Teacher mode may also show expected VSEPR guidance from the selected activity template and misconception check points.
Those expected values are guidance for classroom discussion, not automatic scoring rules and not measured geometry.

## Source Note

The MVP follows standard classroom VSEPR assumptions, including the distinction between electron-domain geometry and molecular shape and treating multiple bonds as one electron-domain direction for geometry prediction.
OpenStax Chemistry 2e, Section 7.6, was used as a reference for these classroom VSEPR boundaries.
