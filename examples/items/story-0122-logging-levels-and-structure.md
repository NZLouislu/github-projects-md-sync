## Story: Logging Levels and Structure

### Story ID

Story-0122

### Status

In review

### Description

Unify logging levels and structure:
- INFO: normal flow (Created/Skipped summary and per-item logs).
- WARNING: unknown section, duplicate id, unknown field keys.
- ERROR: parsing failures/required fields missing (e.g., story id).
  **Acceptance Criteria:**
- Given a duplicate id, when parsing, then a WARNING includes the id and duplicate line.
- Given a critical parse error, when importing, then an ERROR includes type/file/line/message and exit code 1.
- Given a created item, when importing, then an INFO includes the story id.
  Tests:
  Unit:
  - Level routing; message shape assertions
    Integration:
  - Pipeline emits expected levels under scenarios
    E2E:
  - Logs readable and actionable in terminal
