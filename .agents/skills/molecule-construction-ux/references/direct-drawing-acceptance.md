# Direct Drawing Acceptance Matrix

| Scenario | Input method | Expected graph | Expected UI |
|---|---|---|---|
| Place one carbon | mouse + touch | A=1, B=0, C=1 | neutral/ready |
| Draw butane skeleton | mouse | A=4, B=3, C=1 | connected success |
| Draw butane skeleton | touch/mobile | A=4, B=3, C=1 | connected success |
| Place four isolated carbons | mouse | A=4, B=0, C=4 | disconnected warning |
| Branch from second carbon | mouse | A=5, B=4, C=1 | connected success |
| Undo branch | mouse | previous graph restored | counts updated |
| Redo branch | mouse | branched graph restored | counts updated |
| Clear canvas | any | A=0, B=0, C=0 | results cleared |
| Load example after manual drawing | any | example graph | stale manual results removed |

A = atom count, B = bond count, C = connected-component count.

## Evidence

For every supported input method, record:

- browser/device or emulator
- viewport
- exact editor tool used
- exact gestures
- extracted SMILES/Molfile
- graph summary
- screenshot or trace location
