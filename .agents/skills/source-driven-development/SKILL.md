---
name: source-driven-development
description: Use when selecting or changing libraries, APIs, editor tools, event hooks, file formats, chemistry algorithms, or test strategies; requires primary-source verification and a recorded decision before implementation.
---

# Source-Driven Development Skill

## Purpose

Use this skill whenever making a technical or chemistry capability claim or adding/changing a dependency.

Model memory is not evidence for the exact API of the installed Ketcher, RDKit, 3Dmol, Playwright, or Firebase version.

## Required Process

1. Identify the exact decision or assumption.
2. Inspect the repository lockfile/package manifest for installed versions.
3. Check primary documentation or official repository for that version.
4. Check license and maintenance/upgrade risk where relevant.
5. Record the decision in `docs/LIBRARY_DECISION_LOG.md`.
6. Implement a minimal spike.
7. Add a regression that proves the claimed capability.
8. Record uncertainty when documentation and runtime behavior differ.

## High-Risk Decisions Requiring Explicit Evidence

- editor structure-change events
- chain tool behavior and toolbar availability
- touch/pointer support
- private editor DOM/state access
- RDKit fragment/component APIs
- RDKit JSON atom/bond schema
- Molfile version support
- conformer generation and geometry methods
- 3D coordinate provenance
- file conversion and stereochemistry preservation

## Source Priority

1. Official versioned documentation
2. Official GitHub repository/tag/source
3. Package registry metadata
4. Peer-reviewed or authoritative chemistry source
5. Community examples only after primary sources

## Required Decision Note

```md
## YYYY-MM-DD — Decision title

- Installed version:
- Decision:
- Primary source:
- Evidence:
- Public or private API:
- License:
- Upgrade/maintenance risk:
- Test/verification:
- Outcome:
- Remaining uncertainty:
```

## Do Not

- Do not add dependencies based only on model memory.
- Do not invent method or event names.
- Do not assume editor features are exposed in embedded mode.
- Do not assume RDKit Python, C++, and JavaScript APIs are identical.
- Do not copy code without checking license.
- Do not hide uncertain behavior behind confident comments.

## Output Standard

Mention:

- installed version
- exact sources checked
- verified capability
- code/test change
- remaining uncertainty
- local verification path
