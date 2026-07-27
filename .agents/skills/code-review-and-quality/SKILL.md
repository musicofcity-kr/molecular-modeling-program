---
name: code-review-and-quality
description: Use before accepting substantial molecule-workbench changes, especially direct drawing, connectivity, RDKit validation, VSEPR, editor integration, export, dependencies, and classroom result gating.
---

# Code Review and Quality Skill

## Purpose

Use this skill to review generated code for correctness, maintainability, interaction quality, and chemistry safety.

## Must-Fix Review Checklist

### Construction and connectivity

- Is direct student drawing actually supported and tested?
- Does the app distinguish atoms, bonds, and connected components?
- Are isolated atoms treated as components?
- Is single-molecule versus ionic/mixture intent explicit?
- Can a parseable multi-fragment input be incorrectly reported as one molecule?
- Do undo/redo/clear/example load synchronize graph and result state?

### Chemistry safety

- Are formula/mass/canonical results gated by deterministic validation?
- Is connectivity policy applied before confident single-molecule output?
- Is VSEPR local-center based for multi-center structures?
- Are ideal angles, generated measurements, and reference values separated?
- Are generated/reference 3D sources labelled?
- Are invalid or unsupported structures blocked from confident output?

### Editor integration

- Is raw Ketcher API isolated behind an adapter?
- Are private editor APIs avoided or pinned/documented/tested?
- Are structure-change events handled?
- Is direct chain construction verified with actual pointer and touch/manual evidence?

### Frontend and accessibility

- Are components purposeful and state ownership clear?
- Are async loading and stale states handled?
- Are warnings student-friendly and actionable?
- Are critical controls usable at mobile width and without hover?

### TypeScript and domain model

- Are public interfaces typed?
- Are `StructureIntent`, graph summary, connectivity decision, validation, and VSEPR states explicit?
- Are impossible/unsupported states represented rather than hidden?

### Test quality

- Are valid, invalid, connected, and disconnected cases covered?
- Does E2E include actual drawing rather than only presets?
- Is graph state asserted instead of pixel appearance?
- Are typecheck, unit/integration, E2E, and build results reported?

## Blocking Conditions

Block acceptance if:

- disconnected atoms can pass as one molecule in single-molecule mode
- formula/mass is computed or displayed without deterministic validation
- direct drawing is claimed but no actual interaction test/manual evidence exists
- 2D cleanup is described as VSEPR or literal 3D geometry
- one global VSEPR shape is assigned to a multi-center chain
- raw editor API leaks across the app
- private editor internals are used without pinning/risk/tests
- dependency is added without source/license decision log
- invalid structures silently produce confident results

## Review Score

Use `references/review-rubric.md`. Any blocking condition overrides the numeric score.

## Output Standard

Return:

1. Blocking defects
2. Must fix
3. Should improve
4. Nice to have
5. Verification commands and evidence gaps
6. Release decision: accept / conditional / reject
