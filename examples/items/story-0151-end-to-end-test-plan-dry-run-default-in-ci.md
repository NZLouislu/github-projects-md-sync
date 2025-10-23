## Story: End-to-End Test Plan (Dry-Run default in CI)

### Story ID

Story-0151

### Status

In review

### Description

End-to-end testing (dry-run by default):
- Use example docs and a mocked Project to validate the full pipeline from parsing to planning/export.
- Optional live run: with secure env vars, perform one real export and compare format.
  **Acceptance Criteria:**
- Given CI run, when executing dry-run E2E, then the pipeline passes with expected plans/logs and zero side effects.
- Given an optional live run (with token), then export output matches the single-story template requirements.
  Tests:
  E2E:
  - CI job executes dry-run across md→project & project→md
  - Optional manual job for live export (guarded by env)


