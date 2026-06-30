# VSEPR Cross-Validation Report

Date: 2026-06-30

## Scope

This report cross-checks the current Workbench VSEPR implementation against:

1. Claude prototype files:
   - `vsepr-engine.js`
   - `분자구조_VSEPR_시뮬레이터.html`
2. Current Workbench implementation:
   - `apps/workbench/src/services/vseprEngine.ts`
   - `apps/workbench/src/services/vseprGeometryTemplates.ts`
3. OpenStax Chemistry 2e, Section 7.6, as a classroom VSEPR reference.

The purpose is not to import Claude's simulator wholesale. The purpose is to
confirm which VSEPR mappings and behaviors are safe to apply while preserving
the Workbench boundary:

```text
Ketcher input -> RDKit.js validation -> VSEPR educational prediction -> 3Dmol.js visualization
```

## External Reference Rules Checked

OpenStax Chemistry 2e Section 7.6 supports the following classroom rules:

- VSEPR predicts approximate local structure around a central atom from the
  number of bonds and lone pairs in a Lewis structure.
- Electron-pair geometry and molecular structure are different when lone pairs
  are present.
- A single, double, or triple bond counts as one region of electron density.
- In trigonal bipyramidal arrangements, lone pairs occupy equatorial positions.
- In octahedral AX4E2 arrangements, the two lone pairs are opposite each other.

These rules match the Workbench MVP policy.

## Mapping Cross-Check

| Claude notation | Workbench notation | Electron-domain geometry | Molecular shape | Current status |
|---|---|---|---|---|
| AX2E0 | AX2 | 선형 | 선형 | Pass |
| AX3E0 | AX3 | 삼각 평면 | 삼각 평면 | Pass |
| AX2E1 | AX2E | 삼각 평면 | 굽은형 | Pass |
| AX4E0 | AX4 | 정사면체 | 정사면체 | Pass |
| AX3E1 | AX3E | 정사면체 | 삼각뿔형 | Pass |
| AX2E2 | AX2E2 | 정사면체 | 굽은형 | Pass |
| AX5E0 | AX5 | 삼각쌍뿔 | 삼각쌍뿔 | Pass |
| AX4E1 | AX4E | 삼각쌍뿔 | 시소형 | Pass |
| AX3E2 | AX3E2 | 삼각쌍뿔 | T자형 | Pass |
| AX2E3 | AX2E3 | 삼각쌍뿔 | 선형 | Pass |
| AX6E0 | AX6 | 팔면체 | 팔면체 | Pass |
| AX5E1 | AX5E | 팔면체 | 사각뿔형 | Pass |
| AX4E2 | AX4E2 | 팔면체 | 사각평면형 | Pass |

Terminology note:

- Claude uses labels such as `직선형`, `평면삼각형`, `정팔면체형`.
- The Workbench uses `선형`, `삼각 평면`, `팔면체`.
- These are treated as classroom-equivalent labels for this MVP. The app keeps
  one consistent wording set rather than mixing synonyms in the student UI.

## Molecule Fixture Cross-Check

| Example | Expected VSEPR | Workbench behavior | Status |
|---|---|---|---|
| CO2 | AX2, 선형 | Double bonds count as two bonded domains but one domain each; center C selected | Pass |
| BeCl2 | AX2, 선형 | Be supported as a simple main-group center | Pass |
| BF3 | AX3, 삼각 평면 | B supported; clear center auto-selected | Pass |
| SO2 | AX2E, 굽은형 | Double bonds each count as one VSEPR domain; S has one lone pair | Pass |
| CH4 | AX4, 정사면체 | Implicit H inference gives four bonded domains | Pass |
| NH3 | AX3E, 삼각뿔형 | `AX3E1` bug fixed; compact `AX3E` displayed | Pass |
| H2O | AX2E2, 굽은형 | Implicit H inference gives two bonded domains and two lone pairs | Pass |
| PCl5 | AX5, 삼각쌍뿔 | P supported; clear center auto-selected | Pass |
| SF4 | AX4E, 시소형 | S supported; one lone pair | Pass |
| ClF3 | AX3E2, T자형 | Cl supported; two lone pairs | Pass |
| XeF2 | AX2E3, 선형 | Xe supported with medium confidence | Pass |
| SF6 | AX6, 팔면체 | S supported; six bonded domains | Pass |
| BrF5 | AX5E, 사각뿔형 | Br supported with medium confidence | Pass |
| XeF4 | AX4E2, 사각평면형 | Xe supported with medium confidence | Pass |

## Accepted From Claude Prototype

- Classroom preset coverage for Be, B, Xe, P, S, Cl, Br examples.
- Claude-style notation aliases:
  - `AXmE0` maps to `AXm`.
  - `AXmE1` maps to `AXmE`.
  - `AXmE2+` stays explicit.
- Clear-center auto-selection for one central atom plus terminal heavy ligands.

## Rejected From Claude Prototype

These parts are intentionally not integrated:

- Repulsion-energy relaxation solver as the production engine.
- Canvas rendering layer.
- Student-facing experimental angle values as authoritative outputs.
- Polarity classification by vector sum.

Reason:

The Workbench MVP must keep VSEPR output as an educational prediction. It must
not imply quantum optimization, energy minimization, experimental bond angles,
or a measured 3D structure.

## Remaining Risks

| Risk | Mitigation |
|---|---|
| Students may treat ideal angles as measured angles | UI labels must keep `예상`, `교육용`, and `정밀 실험값 아님`. |
| Xe/Br cases are beyond early high-school core examples | Keep confidence at medium and use mainly teacher-guided contexts. |
| Lewis-structure formal charge/resonance cases may be simplified | Keep unsupported/low-confidence paths for non-integer lone-pair estimates and resonance-heavy structures. |
| Terminology mismatch across source materials | Keep one Workbench term set and document synonym handling. |

## Verification Commands

```powershell
cd C:\all\molecule-modeling-skill-package\apps\workbench
npx tsc --noEmit
npm test -- --run src/services/vseprEngine.test.ts src/services/vseprGeometryTemplates.test.ts src/components/Vsepr3DModelViewer.test.tsx src/components/vsepr/VseprPanel.test.tsx src/app/App.test.tsx
npm run build
```

Latest targeted result:

- TypeScript check: passed
- VSEPR/App related tests: 5 files, 22 tests passed after SO2/full-alias additions
- Production build: passed with existing 3Dmol.js bundle warnings
