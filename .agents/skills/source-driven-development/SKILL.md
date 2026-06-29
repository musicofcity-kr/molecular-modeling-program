---
name: source-driven-development
description: Use when selecting libraries, APIs, dependencies, file formats, or chemistry algorithms; requires checking primary documentation and recording the decision before implementation.
---

# Source-driven Development Skill

## Purpose

Use this skill whenever Codex is about to make a technical claim or add a dependency.

For this project, chemistry libraries and file-format support must be based on sources, not guesses.

## Required Process

1. Identify the exact decision.
2. Check primary source documentation or repository README.
3. Check license and maintenance risk when relevant.
4. Record the decision in `docs/LIBRARY_DECISION_LOG.md`.
5. Implement only the minimum necessary spike.
6. Add verification steps.

## Source Priority

1. Official documentation
2. Official GitHub repository
3. Package registry page
4. Peer-reviewed or authoritative chemistry documentation
5. Community examples only after primary sources

## Required Decision Note

```md
## YYYY-MM-DD — Decision title

- Decision:
- Source checked:
- Evidence:
- Risk:
- Test/verification:
```

## Do Not

- Do not add dependencies based only on model memory.
- Do not assume a package supports a format without checking docs.
- Do not ignore maintenance warnings.
- Do not copy code from a repo without checking license.

## Output Standard

For dependency work, final response must mention:

- what was checked
- what was changed
- what remains uncertain
- how to verify locally
