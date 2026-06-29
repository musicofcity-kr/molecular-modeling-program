---
name: e2e-playwright-testing
description: Use when writing or reviewing Playwright end-to-end tests for molecule editor workflows, example loading, validation result display, image export, and 3D viewer behavior.
---

# E2E Playwright Testing Skill

## Purpose

Use this skill for browser-level tests of the molecule modeling app.

Ketcher-like editors are interaction-heavy. Unit tests alone are not enough.

## E2E Test Priorities

1. App loads and main regions are visible.
2. Example molecule can be loaded.
3. Validation result appears after example load.
4. Invalid input path shows warning.
5. Export button creates a result or triggers download.
6. 3D viewer loads only after valid structure/coordinate input.

## Selector Rules

- Add stable `data-testid` attributes to app-owned UI.
- Do not depend on fragile internal Ketcher DOM unless unavoidable.
- Prefer loading example molecules over drawing complex molecules by mouse in MVP tests.

## Suggested Test IDs

```text
data-testid="app-shell"
data-testid="chemical-editor"
data-testid="example-select"
data-testid="validate-button"
data-testid="validation-status"
data-testid="formula-output"
data-testid="molecular-weight-output"
data-testid="export-svg-button"
data-testid="viewer-3d"
```

## MVP E2E Scenarios

```text
load ethanol example → validate → formula appears
load benzene example → validate → canonical smiles/status appears
empty editor → validate → warning appears and formula is hidden
```

## Do Not

- Do not make E2E tests depend on network unless the feature is explicitly network-based.
- Do not rely on pixel-perfect screenshots for chemistry correctness.
- Do not skip headless test stability checks.

## Output Standard

When adding E2E tests, report:

- scenario covered
- command to run
- known flakiness risks
- what is not yet covered
