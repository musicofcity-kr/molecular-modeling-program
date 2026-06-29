---
name: ketcher-integration
description: Use when integrating Ketcher or another 2D chemical editor into the molecule modeling app, including editor loading, structure import/export, SMILES/Molfile extraction, reaction canvas support, and editor UI reliability.
---

# Ketcher Integration Skill

## Purpose

Use this skill for all 2D chemical editor work.

Ketcher is treated as the structure input and editing surface. It should not be treated as the only source of chemical truth. Outputs must be validated by RDKit.js before classroom-facing calculations are displayed.

## Required Workflow

1. Confirm editor dependency and version.
2. Record dependency decision in `docs/LIBRARY_DECISION_LOG.md`.
3. Build a minimal editor wrapper component.
4. Expose only stable wrapper methods to the rest of the app.
5. Extract SMILES and Molfile.
6. Pass extracted structure to RDKit validation service.
7. Show editor errors in Korean-friendly classroom language.

## Wrapper Interface Target

```ts
export type ChemicalEditorHandle = {
  getSmiles(): Promise<string>;
  getMolfile(): Promise<string>;
  setMolecule(input: { smiles?: string; molfile?: string }): Promise<void>;
  clear(): Promise<void>;
};
```

## Do Not

- Do not let UI panels call the raw Ketcher API directly.
- Do not assume a drawn structure is chemically valid.
- Do not suppress editor load errors.
- Do not hard-code CDN URLs without documenting offline/classroom implications.

## Test Cases

Minimum integration cases:

- editor loads without crashing
- ethanol example loads
- benzene example loads
- SMILES extraction returns non-empty value
- invalid/empty canvas is handled gracefully

## Classroom UI Notes

Use Korean labels such as:

- 구조식 그리기
- 예제 불러오기
- 구조 검증하기
- SMILES 보기
- MOL 파일 보기
- 구조를 먼저 그려주세요
- 구조 검증에 실패했습니다

## Output Standard

When making Ketcher changes, include:

- dependency version or source checked
- wrapper API changed or unchanged
- validation handoff path
- manual test steps
