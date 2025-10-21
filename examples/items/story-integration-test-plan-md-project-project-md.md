## Story: Story: Integration Test Plan (md→project & project→md)

### Status

In review

### Description

story id: Story 0150-Integration
description:
Integration tests covering core paths and tolerance:
- md→project: Created/Skipped/Errors stats; idempotent on re-run.
- Alias mapping: To do→Ready, in progress normalization; Done is correctly marked.
- Error reporting: missing id recorded as ERROR; other valid stories proceed (or produce correct plans in dry-run).
- project→md: multi-file export by filters; file structure complete (### Story ID/Status/Description).
  **Acceptance Criteria:**
- Given mixed inputs, when run, then stats/diagnostics match expectations deterministically.
- Given re-run, when run again, then no additional changes (idempotent).
  Tests:
  Integration:
  - End-to-end pipeline in mocked environment; asserts files/plans/logs
    E2E (dry-run):
  - Realistic doc verified for plans and logs only
