# E2E Scenario Set

## A. Direct linear chain — blocking

1. Open the student workbench.
2. Wait for editor ready.
3. Select carbon/bond or verified chain tool.
4. Draw a four-carbon linear chain by actual pointer gestures.
5. Trigger or await graph summary.
6. Expect atom count 4.
7. Expect bond count 3.
8. Expect component count 1.
9. Validate.
10. Expect no disconnected warning.

## B. Isolated atoms — blocking

1. Clear the editor.
2. Place four carbons in empty space without bonds.
3. Expect A=4, B=0, C=4.
4. In `single-molecule` mode, expect blocked connectivity state.
5. Expect formula/mass hidden or clearly not accepted as one molecule.
6. Expect Korean reconnection guidance.

## C. Branch and history

1. Draw a short carbon chain.
2. Add one branch.
3. Expect one component.
4. Undo and verify graph counts.
5. Redo and verify graph counts.

## D. Mobile/touch construction

1. Use a mobile project with touch enabled.
2. Repeat direct linear-chain construction.
3. Verify graph counts, not pixels.
4. Confirm critical editor tools/help remain accessible.

## E. Preset validation smoke

1. Load water or ethanol preset.
2. Validate with real RDKit.
3. Verify formula and mass.
4. Verify local VSEPR where applicable.
5. Verify separately labelled 3D viewer.

## F. Multi-component intent

1. Load/draw an ionic pair or mixture fixture.
2. In single-molecule mode, expect block.
3. In configured ionic/mixture mode, expect allowed-with-explanation state.
4. Verify molecular formula/mass presentation follows the selected policy.

## G. State invalidation

1. Validate a molecule successfully.
2. Modify the editor structure.
3. Expect prior formula, mass, VSEPR, and 3D-derived state to become stale/cleared until revalidation.
