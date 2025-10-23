## Story: Implement Multi-Story Parser

### Story ID

Story-0112

### Status

Backlog

### Description

Parse multi-story markdown, core capabilities:
- Status mapping: recognize section headings (Backlog/Ready/In progress/In review/Done); map unknown sections to Backlog.
- Field parsing: parse per-story field keys (story id:, description:); use field keys as content boundaries; preserve raw Markdown.
- Error tolerance:
  - Missing story id: skip the item and log ERROR (with file, line, title).
  - Duplicate story id within the same file: keep the first occurrence, skip the rest, and log WARNING (with duplicate id and line).
  - Unknown field keys: ignore and log WARNING.
    **Acceptance Criteria:**
- Given an unknown section, when parsing, then stories in that section map to Backlog and parsing continues.
- Given a missing story id, when parsing, then the item is skipped with a structured ERROR (file/line/title).
- Given a duplicate story id in the same file, when parsing, then keep the first and skip the rest with a WARNING including id and line.
  Tests:
  Unit:
  - Map known sections to statuses; unknown section → Backlog
  - Field boundary splitting for description; preserves Markdown
  - Missing ID → error recorded; Duplicate ID → warning + skip
    Integration:
  - Mixed valid/invalid stories parsed into a deterministic result set with collected errors/warnings
    E2E (dry-run):
  - On a sample doc, print planned actions with no API calls; errors/warnings visible


