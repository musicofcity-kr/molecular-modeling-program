---
name: test-driven-development
description: Use when implementing molecule modeling features with regression-first tests, including graph connectivity, direct construction behavior, RDKit validation, VSEPR, editor adapters, export, and UI gating.
---

# Test-Driven Development Skill

## Purpose

Use this skill to implement changes with failing tests first rather than demo-only code.

## Testing Priority

1. Pure graph/connectivity tests
2. RDKit validation and lifecycle tests
3. VSEPR local-center tests
4. Editor adapter integration tests
5. UI gating/state invalidation tests
6. Export tests
7. Playwright direct-construction E2E

## Red–Green–Refactor

1. Write a failing test that describes the user-visible defect.
2. Add the smallest graph/domain test that isolates the rule.
3. Add an integration or E2E regression for the actual interaction.
4. Implement the minimum fix.
5. Run focused tests.
6. Refactor.
7. Run full typecheck/test/build/E2E gates.
8. Update docs and fixture expectations.

## Required Fixture Model

Prefer fixtures with both representation and graph expectations:

```ts
{
  id: 'butane',
  smiles: 'CCCC',
  intent: 'single-molecule',
  expected: { atomCount: 4, bondCount: 3, componentCount: 1 }
}
```

For disconnected structures, use Molfile/editor-graph fixtures rather than misleading SMILES regex logic.

## Must-Test Behaviors

- valid molecule passes chemistry validation
- invalid molecule fails
- single connected atom is one component
- four isolated carbons are four components and blocked in single-molecule mode
- linear and branched chains are one component
- ionic/mixture exceptions require explicit intent
- formula/mass remain hidden or qualified when policy fails
- VSEPR is local-center based for chains
- 2D layout actions do not change chemical connectivity unexpectedly
- editor change invalidates prior results
- example loading does not mutate fixtures or retain stale state
- export uses current validated structure

## Mock Boundaries

- Do not mock pure graph rules in their own tests.
- Do not mock RDKit in core validation tests.
- Mock external network services when not under test.
- Editor wrapper tests may use a contract fake, but direct browser E2E must cover actual editor interaction.

## Do Not

- Do not use snapshots as the only chemistry assertion.
- Do not assert only “non-empty SMILES.”
- Do not test only preset loading for a direct drawing feature.
- Do not depend on editor private internals in unit tests.
- Do not weaken assertions to make flaky gestures pass.

## Output Standard

Report:

- failing test written first
- fixtures added
- focused tests run
- full gates run
- manual direct-drawing verification
- unresolved failures or unsupported cases
