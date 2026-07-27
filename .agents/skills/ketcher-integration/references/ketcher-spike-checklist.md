# Ketcher Integration Spike Checklist

1. Confirm package names, versions, license, and asset strategy.
2. Confirm official APIs for set/get/clear and change observation.
3. Create or inspect the app-owned editor adapter.
4. Load a known SMILES.
5. Extract SMILES.
6. Extract Molfile in the exact supported format.
7. Place one atom manually.
8. Draw a two-atom bond manually.
9. Draw a four-carbon linear chain manually.
10. Draw a branch manually.
11. Place four isolated atoms and confirm they remain disconnected.
12. Test undo, redo, clear, and example replacement.
13. Record extracted structure and graph counts for each scenario.
14. Verify structure-change invalidates stale results.
15. Verify mouse/pointer behavior.
16. Verify touch/mobile behavior.
17. Handle editor load/extraction failure.
18. Pass structure to connectivity and RDKit layers.
19. Record any private/internal API dependency and pinning risk.
20. Add automated and manual verification notes.
