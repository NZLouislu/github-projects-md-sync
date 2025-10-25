## Story: Dry-Run and Diagnostics Output

### Story ID

Story-0113

### Status

In review

### Description

Provide --dry-run and unified diagnostics:
- Dry-run: display planned actions (Create/Skip), no API calls.
- Structured logs: type(ERROR/WARNING), message, file, line, storyId (optional), suggestion.
- Missing ID → ERROR “Missing ID”; if title exactly matches an existing item, add WARNING “Possible title duplicate”.
  **Acceptance Criteria:**
- Given --dry-run, when running, then only planned actions are printed; no side effects occur.
- Given a missing id, when parsing, then a structured ERROR includes file/line/title.
- Given missing id + title duplicate, when parsing, then add WARNING “Possible title duplicate”.
  Tests:
  Unit:
  - Logger formats fields correctly; levels INFO/WARNING/ERROR
  - Dry-run flag suppresses side effects
    Integration:
  - Full pipeline in dry-run prints accurate plan and diagnostics
    E2E:
  - Human-readable output validated on a sample doc
