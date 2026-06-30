# Activity Result Export Policy

## Purpose

This policy defines the Classroom MVP Release Candidate save/export boundary.
The feature helps students keep a local record of a molecule modeling activity
without adding accounts, databases, Firebase, teacher dashboards, or automatic
grading.

## Storage

- Storage uses browser `localStorage`.
- Key: `molecule-workbench-activity-results`.
- The app keeps a small recent-history list, currently capped at 10 snapshots.
- Saved results are visible only in the current browser profile.
- The feature does not store student name, class, number, login identity, or
  any other student personal identifier.

Student-facing notice:

```text
이 저장은 현재 브라우저에만 보관됩니다. 다른 기기나 브라우저에서는 보이지 않습니다.
```

## Snapshot Contents

`ActivityResultSnapshot` may include:

- app mode and user mode
- activity ID/title and molecule name
- student prediction values
- RDKit validation status, canonical SMILES, molecular formula, average
  molecular weight, and student-facing validation message
- actual/external 3D source label and source note
- coordinate-based measurement results with source notes
- VSEPR educational prediction summary
- actual/external 3D vs VSEPR comparison observations
- activity question answers
- final reflection
- export notice

## Excluded By Default

Default JSON/Markdown/TXT/clipboard exports must not include:

- raw SDF payloads
- raw MOL blocks
- raw Ketcher editor state
- raw PubChem responses
- HTTP status details
- developer logs
- internal enum/type debugging output
- student personal information fields

## Export Formats

Supported in the Classroom MVP RC:

- JSON
- Markdown
- TXT
- clipboard copy of Markdown
- browser print

PDF export and 3D viewer image capture are deferred.

## Chemistry Source Rules

- RDKit.js validation output is the source for formula, average molecular
  weight, and canonical SMILES.
- PubChem/static coordinate data is a 3D visualization source only.
- VSEPR output is an educational prediction model only.
- 3D measurements come from the currently loaded coordinate-bearing 3D payload
  and must not be described as experimental, literature, or optimized geometry.

## Failure Policy

If localStorage fails, the app should suggest Markdown export or clipboard copy.
If clipboard copy fails, the app should suggest Markdown export.
If export file creation fails, the app should keep the RDKit validation result
and student answers unchanged.

Student messages should stay short and practical. Developer diagnostics may be
logged to the console or teacher-only logs, but they must not enter the student
export.
