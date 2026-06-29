---
name: code-review-and-quality
description: Use before accepting or finalizing substantial code changes in the molecule modeling app, especially changes involving chemistry validation, editor integration, dependency additions, export logic, and UI result gating.
---

# Code Review and Quality Skill

## Purpose

Use this skill to review generated code for correctness, maintainability, and chemistry safety.

## Review Checklist

### Chemistry safety

- Are calculated results gated by validation?
- Is uncertain input clearly marked?
- Are generated 3D models labeled by source/method?
- Are invalid structures blocked from confident output?

### Frontend quality

- Are components small and purposeful?
- Is state ownership clear?
- Are async editor/RDKit loading states handled?
- Are errors shown in teacher/student-friendly language?

### TypeScript quality

- Are public interfaces typed?
- Are optional fields handled safely?
- Are errors represented explicitly?

### Dependency quality

- Was dependency rationale recorded?
- Is license risk noted?
- Is bundle/runtime risk considered?

### Test quality

- Are valid and invalid molecules both tested?
- Are regressions covered by examples?
- Are manual steps documented when automation is not possible?

## Blockers

Block or request revision if:

- formula/mass is computed without RDKit validation
- raw Ketcher API leaks across the app
- code claims experimental 3D accuracy without source
- dependency is added without decision log
- invalid molecules silently produce results

## Output Standard

Review response should include:

1. Must fix
2. Should improve
3. Nice to have
4. Verification commands
