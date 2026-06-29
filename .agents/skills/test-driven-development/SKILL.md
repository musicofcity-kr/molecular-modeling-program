---
name: test-driven-development
description: Use when implementing molecule modeling features that need tests, including validation services, example molecule fixtures, editor integration, export behavior, and regression checks.
---

# Test-driven Development Skill

## Purpose

Use this skill to implement changes with tests instead of demo-only code.

## Testing Priority

1. Chemistry validation service tests
2. Example molecule fixture tests
3. UI gating tests
4. Export tests
5. Playwright E2E tests for editor workflows

## Red-Green-Refactor Flow

1. Write or update a failing test that describes the target behavior.
2. Implement the smallest code change.
3. Run the test.
4. Refactor without changing behavior.
5. Update docs if behavior changed.

## Required Fixture Set

- water: `O`
- methane: `C`
- ethanol: `CCO`
- acetic acid: `CC(=O)O`
- benzene: `c1ccccc1`
- aspirin: `CC(=O)Oc1ccccc1C(=O)O`

## Must-test Behaviors

- valid molecule returns validation success
- invalid molecule returns validation failure
- UI hides formula/mass when validation fails
- example molecule loading does not mutate fixture data
- export uses current validated molecule

## Do Not

- Do not use snapshots as the only validation for chemistry behavior.
- Do not test implementation details of Ketcher internals.
- Do not skip invalid-input tests.

## Output Standard

When done, report:

- tests added
- tests run
- failing tests if any
- manual verification path
