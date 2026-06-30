# Teacher/Student Mode Policy

## Purpose

The mode split separates classroom-facing student work from teacher-facing guidance.
It does not add authentication, student accounts, database storage, Firebase, dashboards, or automatic grading.

## User Modes

```ts
export type UserMode = 'student' | 'teacher';
```

### Student Mode

Student mode is inquiry and response entry.

It may show:

- activity selection
- learning goal
- molecule drawing with Ketcher
- prediction input fields
- RDKit.js validation result
- VSEPR analysis result only inside an explicit optional module or a VSEPR-required activity
- actual/external 3D viewer
- VSEPR prediction model viewer only as an educational prediction model
- actual/external 3D vs VSEPR comparison mode, including observation prompts and source-limit warnings
- student reflection fields

It must hide:

- teacher notes
- misconception checklists
- developer logs
- raw API response text
- HTTP status details
- internal type information
- excessive debug messages

### Teacher Mode

Teacher mode is activity guidance and diagnostic reference.

It may show:

- selected activity template information
- learning goal
- core concepts
- expected molecular formula from the recommended example metadata
- expected VSEPR guidance
- activity question lists
- student input checklist
- RDKit.js validation status
- VSEPR analysis status
- 3D structure availability
- PubChem connection status
- actual/external 3D vs VSEPR comparison availability
- VSEPR confidence and comparison caution reason
- misconception check points
- collapsible developer logs

Teacher mode must not turn guidance into scoring.

## Independent Mode Axes

`UserMode` is independent from `AppMode`.

The app must support:

- `free_draw + student`
- `free_draw + teacher`
- `activity + student`
- `activity + teacher`

Switching one mode must not reset the molecule editor, RDKit validation result, VSEPR analysis, 3D viewer state, or PubChem state.

## Non-Goals

This phase must not implement:

- login
- Firebase
- database storage
- student-specific submission lists
- automatic scoring
- teacher dashboard workflows
- activity result PDF/image export

## Chemistry Boundaries

- RDKit.js remains the source for formula, average molecular weight, and canonical SMILES.
- Teacher expected values are guidance metadata and must not overwrite RDKit.js validation output.
- VSEPR expected values are classroom model guidance and must not be presented as measured geometry.
- PubChem values and external 3D coordinates are source-labeled visualization data, not the calculation source.

## UI Boundary

Teacher-facing information must not appear in student mode.

Developer logs should be visible only in teacher mode and should be behind a `개발자 로그 보기` toggle.

## VSEPR Optional Module Boundary

VSEPR is not a permanent default panel in free-draw student mode.

- `free_draw + student`: show the optional VSEPR module gate only; the full VSEPR panel and VSEPR 3D model viewer stay closed until the student explicitly opens them.
- `free_draw + teacher`: teacher guidance may show VSEPR analysis status, but this remains diagnostic guidance, not a student worksheet.
- `activity + student`: show VSEPR only when the selected `ActivityTemplate.requiresVsepr` is `true`.
- `activity + teacher`: show expected VSEPR information and misconception checks only as teacher guidance.

This boundary prevents students from confusing VSEPR teaching models with
actual/external 3D coordinate structures.

## Comparison Mode Boundary

Student mode may show:

- comparison mode open/close control;
- separate labels for `실제/외부 3D 좌표 기반 구조` and `VSEPR 교육용 예측 모형`;
- observation prompts for similarities, differences, and why VSEPR cannot fully
  replace real coordinate data;
- short warnings that PubChem/static coordinates and VSEPR predictions are
  different sources.

Student mode must hide:

- comparison developer logs;
- raw PubChem response details;
- HTTP status details;
- internal availability enum names;
- teacher-only caution notes.

Teacher mode may show:

- comparison availability;
- VSEPR confidence;
- 3D coordinate source;
- whether the selected molecule is recommended for comparison;
- caution notes for multi-center or complex molecules.

Comparison observations are not scored, saved to a database, or treated as a
submitted assessment in this phase.

## Activity Result Export Boundary

Student mode may show:

- activity result summary
- local browser save
- JSON export
- Markdown export
- TXT export
- clipboard copy
- browser print
- a notice that local save is only available in the current browser
- a notice that exported results are classroom records, not automatic scores

Student mode must still hide:

- developer logs
- raw PubChem response text
- HTTP status details
- raw SDF or MOL block payloads
- internal type names and debug messages
- teacher-only misconception explanations

Teacher mode may show:

- whether a result snapshot can be generated
- RDKit validation status
- actual/external 3D coordinate source
- PubChem usage status
- VSEPR analysis status
- comparison mode status
- measurement source warnings
- an export-included/excluded-item explanation

The export panel must not introduce login, database storage, Firebase,
student-specific submission lists, automatic grading, or a teacher dashboard.
