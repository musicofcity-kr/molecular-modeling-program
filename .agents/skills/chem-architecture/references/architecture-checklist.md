# Architecture Checklist

- Is the editor separated from graph/connectivity logic?
- Is raw editor API hidden behind an adapter?
- Is `StructureIntent` explicit?
- Can atom, bond, and component counts be represented?
- Are isolated atoms counted as components?
- Can disconnected input be blocked in single-molecule mode?
- Are ionic/mixture exceptions explicit rather than implicit?
- Is deterministic validation separate from connectivity policy?
- Are 2D layout, VSEPR model, and 3D coordinates separate?
- Is VSEPR local-center based for multi-center molecules?
- Does every calculated result trace to a validated structure?
- Are direct pointer and touch workflows part of acceptance?
- Is the dependency/API decision logged?
- Can the MVP run without unnecessary backend services?
