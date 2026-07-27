# Migration and Usage Guide

## Replace the Previous Package

1. Back up the existing project `.agents` directory.
2. Extract this archive at the repository root so the result is:

```text
<repository-root>/.agents/
```

3. Do not nest it as `.agents/.agents/`.
4. Start substantial work by explicitly invoking or instructing the coding agent to follow:

```text
.agents/skills/molecular-workbench-orchestrator/SKILL.md
```

5. For the existing molecular modeling repository, use the first task below as a package smoke test.

## Recommended First Task

```text
Follow the molecular-workbench-orchestrator skill and inspect the current direct-drawing path.
Reproduce and fix these cases without changing unrelated classroom/auth features:
1. Draw a four-carbon linear chain directly in Ketcher and verify A=4, B=3, C=1.
2. Place four isolated carbon atoms and verify A=4, B=0, C=4 with a single-molecule warning.
3. Add explicit StructureIntent and connectivity gating before RDKit-derived result display.
4. Keep 2D layout separate from local-center VSEPR and 3D coordinate views.
5. Add unit, integration, Playwright pointer, mobile/touch or documented manual-device tests.
Report exact files, commands, evidence, and remaining uncertainty.
```

## Expected Implementation Order

```text
1. Graph types and connectivity policy
2. RDKit graph summary integration
3. Editor adapter/state invalidation
4. Connectivity status UI
5. Direct pointer chain E2E
6. Touch/mobile verification
7. Local-center VSEPR boundary cleanup
8. Review and release gates
```

## Compatibility Notes

- Existing skill folder names are retained.
- Four new skills were added.
- Existing application code is not included or modified by this package.
- The package does not invent Ketcher/RDKit API names; it requires checking the installed version before implementation.
- If a coding agent cannot automate touch interaction reliably, it must document a manual device test rather than claim automated coverage.
