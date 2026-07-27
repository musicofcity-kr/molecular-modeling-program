---
name: e2e-playwright-testing
description: Use when writing or reviewing Playwright tests for real molecule-editor workflows, including direct atom/bond/chain drawing, disconnected structures, pointer/touch behavior, example loading, validation gating, VSEPR, export, and 3D viewers.
---

# E2E Playwright Testing Skill

## Purpose

Use this skill for browser-level validation of the molecule modeling app.

Unit tests are necessary but insufficient for an interaction-heavy chemical editor.

## Test Layers

### Stable smoke tests

Preset loading is appropriate for:

- app/editor load
- deterministic RDKit result display
- downstream VSEPR/3D/export smoke checks

### Core construction acceptance

Preset loading is **not sufficient** for claims that students can draw molecules.

At least the following must use actual pointer/mouse interaction, or a documented version-pinned editor test harness that exercises the same input path:

- one atom
- one bond
- four-carbon linear chain
- four isolated atoms
- branch
- undo/redo

Also verify a mobile/touch path using actual touch events/device emulation when technically supported. If editor touch automation is impossible, perform and document a manual device check; do not claim automated coverage.

## E2E Priorities

1. Ethics/auth shell as applicable.
2. Editor ready state.
3. Direct C4 chain: A=4, B=3, C=1.
4. Four isolated C atoms: A=4, B=0, C=4 and warning.
5. Branched graph remains one component.
6. Connectivity gate precedes formula/mass.
7. Valid example still supports deterministic smoke tests.
8. VSEPR panel is separate from 2D editor layout.
9. 3D viewer appears only for valid/allowed input and labels source.
10. Export uses the current validated structure.

## Selector Rules

- Prefer stable `data-testid` attributes on app-owned controls and summaries.
- Use accessible roles/names for app-owned controls.
- Do not rely on fragile internal editor DOM when avoidable.
- For unavoidable editor internals, pin version, isolate selectors in one helper, document risk, and capture traces.
- Do not use pixel screenshots as chemistry assertions.

## Suggested App-Owned Test IDs

```text
data-testid="chemical-editor-status"
data-testid="structure-intent-select"
data-testid="atom-count-output"
data-testid="bond-count-output"
data-testid="component-count-output"
data-testid="connectivity-status"
data-testid="validate-button"
data-testid="formula-output"
data-testid="molecular-weight-output"
data-testid="vsepr-panel"
data-testid="viewer-3d"
data-testid="construction-help-button"
```

## Interaction Helper Standard

Centralize editor interactions in helpers such as:

```ts
placeAtom(page, point, element)
drawBond(page, from, to)
drawLinearChain(page, start, segments)
selectEditorTool(page, tool)
```

Coordinates must be relative to the editor bounding box and tolerant of viewport differences. Verify the extracted graph after gestures rather than trusting pixels.

## Network Rule

- Mock classroom/backend boundaries when the scenario is not testing those services.
- Do not mock RDKit or graph/connectivity logic in core chemistry E2E.
- Keep a separate optional live-contract suite for real services.

## Required Scenarios

See `references/e2e-scenarios.md`.

## Output Standard

Report:

- scenarios and input methods
- browser/device projects
- app-owned versus editor-internal selectors
- graph assertions
- commands and repeats/retries
- trace/screenshot locations on failure
- manual-only gaps
- known flakiness risks
