# E2E Scenarios

## Scenario 1: Load ethanol

- Open app.
- Select ethanol example.
- Click validate.
- Expect validation status success.
- Expect formula output visible.

## Scenario 2: Empty validation

- Open app.
- Clear editor.
- Click validate.
- Expect warning.
- Expect formula output hidden.

## Scenario 3: Export worksheet image

- Load benzene.
- Validate.
- Click SVG export.
- Expect export action completes.
