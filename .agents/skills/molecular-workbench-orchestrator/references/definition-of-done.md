# Definition of Done

## Core editor acceptance

- [ ] Editor loads at desktop and mobile viewport.
- [ ] One carbon atom can be placed.
- [ ] A four-carbon linear chain can be drawn directly.
- [ ] Expected graph: 4 atoms, 3 bonds, 1 component.
- [ ] Four separately placed carbon atoms produce 4 components and a clear warning.
- [ ] A branched carbon skeleton can be drawn and remains 1 component.
- [ ] Undo/redo restores graph counts correctly.
- [ ] Clear resets graph state and downstream results.
- [ ] Mouse/pointer path verified.
- [ ] Touch/mobile path verified.

## Chemistry gates

- [ ] Result gating uses deterministic validation.
- [ ] Single-molecule mode blocks unexpected multiple components.
- [ ] Ionic-compound and mixture modes use explicit policy.
- [ ] Formula/mass/canonical form are derived from validated structure.
- [ ] VSEPR is local-center based for multi-center structures.
- [ ] Ideal VSEPR angle, generated-coordinate measurement, and curated/reference value are separate fields.

## Quality gates

- [ ] Typecheck passes.
- [ ] Unit/integration tests pass.
- [ ] E2E tests pass.
- [ ] Production build passes.
- [ ] Manual classroom verification is documented.
- [ ] No undocumented chemistry or editor API assumption remains.
