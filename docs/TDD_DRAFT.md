# TDD Draft — Technical Design for Molecule Modeling Workbench

## 1. Architecture Summary

MVP should be frontend-first.

```text
React/Vite App
 ├─ Ketcher Editor Component
 ├─ Structure State Service
 ├─ RDKit Validation Service
 ├─ Molecule Result Panel
 ├─ Export Service
 └─ Example Molecule Library
```

Optional later:

```text
FastAPI Backend
 ├─ RDKit Python advanced validation
 ├─ Open Babel file conversion
 └─ PubChem proxy/cache
```

## 2. Data Flow

1. User draws molecule in Ketcher.
2. App requests SMILES and Molfile from Ketcher.
3. RDKit.js parses the structure.
4. Validation service returns:
   - parse status
   - canonical SMILES
   - formula
   - exact/average molecular weight if available
   - warnings
5. UI displays results only if validation passes.
6. Export service generates image output.

## 3. Core Interfaces

```ts
export type MoleculeInput = {
  source: 'ketcher' | 'example' | 'import';
  smiles?: string;
  molfile?: string;
  label?: string;
};

export type MoleculeValidationResult = {
  ok: boolean;
  canonicalSmiles?: string;
  formula?: string;
  molecularWeight?: number;
  warnings: string[];
  errors: string[];
  sourceMolfile?: string;
};
```

## 4. Validation Gates

- Gate 1: Ketcher editor loaded.
- Gate 2: structure extraction returns non-empty machine-readable data.
- Gate 3: RDKit parses molecule.
- Gate 4: calculated outputs are derived from RDKit-parsed molecule.
- Gate 5: export uses current validated structure.

## 5. Initial Dependencies

- `react`
- `vite`
- `typescript`
- Ketcher package or embedded build, depending on compatibility
- `@rdkit/rdkit` or official RDKit.js package path confirmed at implementation time
- 3Dmol.js only after 2D validation is stable
- `vitest`
- `playwright`

## 6. Testing Strategy

### Unit tests

- Example molecule list validates expected SMILES.
- Validation service handles valid and invalid input.
- Formula/mass display is blocked when validation fails.

### Integration tests

- Ketcher component loads.
- Example molecule can be loaded into editor and extracted back.
- RDKit service initializes once and handles repeated calls.

### E2E tests

- Load ethanol example → see formula/mass.
- Draw or load benzene → export image.
- Invalid structure → warning appears and no confident calculation is shown.

## 7. Risk Register

| Risk | Mitigation |
|---|---|
| Ketcher package integration complexity | Start with minimal embedding spike. |
| RDKit.js WASM loading issues | Create dedicated loader service and test it early. |
| 2D-to-3D conversion is not trivial | Treat 3D viewer as Phase 2; use known examples first. |
| Licensing ambiguity | Keep dependency decision log. |
| Students misinterpret generated 3D geometry | Add method/source label to viewer. |
