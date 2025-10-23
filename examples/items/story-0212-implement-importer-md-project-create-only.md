## Story: Implement Importer (md→project) Create-Only

### Story ID

Story-0212

### Status

In review

### Description

Importer with idempotent create-only by story id:
- If id does not exist: create; if exists: strictly skip (no update/no delete).
- Output stats and exit codes: Created/Skipped/Errors; parsing errors (e.g., missing id) return exit code 1.
- Integrate with Parser: preserve raw Markdown in description; status derived from section heading.
  **Acceptance Criteria:**
- Given a new id, when importing, then Created+1 and the item is created with title/status/description.
- Given an existing id, when importing, then Skipped+1 and no changes to existing items.
- Given an invalid parsed item (e.g., missing id), when importing, then Errors+1 and exit code is 1.
  Tests:
  Unit:
  - Create-only planner: unique id → create plan; existing id → skip plan
  - Stats aggregator: Created/Skipped/Errors tallies
    Integration:
  - Combined with parser output; ensures correct create vs skip paths
    E2E (dry-run):
  - Print “Plan to Create/Skip” lines only; no mutations


