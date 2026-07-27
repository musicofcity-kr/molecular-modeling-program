# Review Rubric v2

Score each area 0–3. Maximum 24.

| Area | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Direct construction | absent | manual only | basic tested | mouse+touch/clear/history tested |
| Connectivity policy | absent | count partial | components gated | intent-aware and fully tested |
| RDKit validation | absent | parse only | gated | lifecycle/warnings/multi-component safe |
| VSEPR/2D boundary | conflated | unclear | separated | local-center, evidence-labelled |
| Classroom UI | confusing | usable | actionable | misconception-safe and accessible |
| Architecture/types | tangled | partial | clear | explicit domain states and adapters |
| Test coverage | absent | preset-only | unit+some E2E | graph+real interaction+build gates |
| Dependency/source discipline | absent | partial | documented | version/API/license/upgrade risk verified |

## Decision

- 22–24: release candidate, provided no blocker exists
- 18–21: conditional; fix identified gaps
- 13–17: not ready for classroom use
- 0–12: redesign required

## Automatic Reject

Regardless of score:

- disconnected structures accepted as one molecule
- direct drawing claim with preset-only tests
- formula/mass without deterministic validation
- 2D layout presented as actual VSEPR geometry
