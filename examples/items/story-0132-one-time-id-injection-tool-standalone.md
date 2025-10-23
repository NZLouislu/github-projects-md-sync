## Story: One-Time ID Injection Tool (Standalone)

### Story ID

Story-0132

### Status

In review

### Description

Standalone one-time tool (decoupled from the core importer):
- Scan markdown and generate unique ids for stories missing id; output suggested patches to be human-approved before import.
  **Acceptance Criteria:**
- Given docs with missing ids, when running the tool, then ids and patch file(s) are generated.
- The tool does not call Project APIs nor change core importer behavior.
  Tests:
  Unit:
  - Deterministic id generation; id uniqueness within a file
    Integration:
  - Patch composition on sample docs; no side effects to importer
    E2E:
  - Operator applies patch and passes dry-run


