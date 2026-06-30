# Classroom MVP Release Checklist

## Included Scope

- React + Vite + TypeScript classroom workbench
- Ketcher 2D molecular structure input
- RDKit.js validation, canonical SMILES, molecular formula, and average
  molecular weight
- example molecule library
- source-labeled actual/external 3D viewer
- static 3D examples and curated PubChem CID 3D loading
- manual PubChem candidate search
- optional VSEPR educational prediction module
- VSEPR teaching-model 3D viewer
- actual/external 3D vs VSEPR comparison observations
- coordinate-based bond length / bond angle measurement MVP
- student/teacher mode split without authentication
- local activity result save and JSON/Markdown/TXT/clipboard/print export

## Explicitly Excluded

- full ChemDraw clone
- student login
- Firebase
- database persistence
- student-specific submission lists
- teacher dashboard expansion
- automatic grading
- PDF export
- 3D viewer image capture
- RDKit 3D conformer generation
- Open Babel backend
- energy minimization
- using PubChem values as RDKit replacements
- treating VSEPR vectors as actual coordinates

## Pre-Release Commands

Run from `apps/workbench`:

```powershell
npx tsc --noEmit
npm test -- --run
npm run build
```

Known build warnings that require review but are not automatic failures:

- `3Dmol.js` eval warning
- large chunk warnings from Ketcher/3Dmol/RDKit bundles

## Classroom QA Scenarios

### Methane activity

1. Switch to `activity + student`.
2. Select methane activity.
3. Enter prediction values.
4. Load or draw methane.
5. Run RDKit validation.
6. Confirm 3D coordinate structure is available.
7. Measure an H-C-H angle if coordinate data is loaded.
8. Confirm VSEPR AX4 / 정사면체 output.
9. Write comparison observations.
10. Save activity result.
11. Export Markdown and copy to clipboard.
12. Refresh and confirm saved local result appears.

### Water activity

1. Select water activity.
2. Validate H2O.
3. Confirm RDKit formula and average molecular weight.
4. Confirm actual/external 3D source where available.
5. Confirm VSEPR AX2E2 / 굽은형 output.
6. Export JSON/Markdown/TXT.

### Direct drawing

1. Switch to `free_draw + student`.
2. Draw an arbitrary molecule.
3. Run RDKit validation.
4. Run PubChem candidate search only by pressing the button.
5. Select a candidate manually if appropriate.
6. Confirm 3D visualization remains source-labeled.
7. Save/export the result without teacher notes or developer logs.

### Teacher mode

1. Switch to `activity + teacher`.
2. Confirm activity template information and misconception checks.
3. Confirm RDKit/VSEPR/3D/PubChem/comparison status displays.
4. Confirm export guidance explains included/excluded fields.
5. Confirm developer logs remain collapsible and are not included in the
   student export.
