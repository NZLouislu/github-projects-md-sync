## Backlog

- Story: Implement Multi-Story Parser
  Story ID: Story-0112
  Description:
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

## In review

- Story: Implement Importer (md→project) Create-Only
  Story ID: Story-0212
  Description:
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

## In review

- Story: Dry-Run and Diagnostics Output
  Story ID: Story-0113
  Description:
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

- Story: Project Export Filters (project→md)
  Story ID: Story-0121
  Description:
    Export filtering and multi-file output:
    - Support status filters (with alias normalization: To do→Ready, In Progress/in progress→In progress).
    - Each exported file is a single-story markdown (includes ### Story ID / ### Status / ### Description).
    **Acceptance Criteria:**
    - Given filters applied, when export runs, then only matching stories are written.
    - Given an output directory, when export completes, then files exist and paths are listed.
    Tests:
      Unit:
        - Status alias normalization is applied in filters
        - Single-story template rendering with required sections
      Integration:
        - Filtered export produces the expected file set and contents
      E2E:
        - Run export on a mock dataset; verify file count and listing

- Story: Logging Levels and Structure
  Story ID: Story-0122
  Description:
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

- Story: ID Format Guidelines and Snippets
  Story ID: Story-0131
  Description:
    Define Story ID format and IDE snippets:
    - Specify charset/length/case-sensitivity; recommend avoiding leading/trailing spaces.
    - Provide a minimal valid template and common error checklist (missing id, invalid format, duplicate id).
    **Acceptance Criteria:**
    - Given the template is used, when authoring, then the doc passes dry-run without errors.
    - Given an invalid id format, when validating, then an ERROR with actionable suggestion is reported.
    Tests:
      Unit:
        - Simple validator hints (trim/length/charset)
      Integration:
        - Dry-run flags format issues with suggestions
      E2E:
        - Authoring flow using the snippet yields a green dry-run

- Story: One-Time ID Injection Tool (Standalone)
  Story ID: Story-0132
  Description:
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

- Story: Deprecation Notice and Rollback Switch
  Story ID: Story-0133
  Description:
    Deprecate the old entry and provide rollback notes:
    - Make clear that src/story-to-project-item.ts is deprecated; document risks and limitations.
    - Define rollback switch/legacy script boundaries (emergency-only, temporary, time-boxed).
    **Acceptance Criteria:**
    - Given the deprecation doc, when read, then users understand the new-only path and the risks of the old entry.
    - Given a rollback need, when following the steps, then the old flow can be temporarily enabled with constraints.
    Tests:
      Unit:
        - N/A (documentation link/anchor checks)
      Integration:
        - CI link-check; presence of deprecation & rollback sections
      E2E:
        - Runbook dry walkthrough validated

- Story: Accessibility and DX Enhancements (Documentation Only)
  Story ID: Story-0141
  Description:
    Documentation readability & discoverability:
    - Improve TOC/index/anchors; glossary; FAQ.
    - Ensure heading hierarchy and order work well with screen readers and keyboard navigation.
    **Acceptance Criteria:**
    - Given docs site navigation, then content is discoverable and headings are clear.
    - Given a screen reader, then sections are read in logical order with clear labels.
    Tests:
      Unit:
        - N/A (documentation structure checks)
      Integration:
        - Lint/markdown-link-check; accessibility lint if applicable
      E2E:
        - Manual checklist for headings/anchors

- Story: Integration Test Plan (md→project & project→md)
  Story ID: Story-0150
  Description:
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

- Story: End-to-End Test Plan (Dry-Run default in CI)
  Story ID: Story-0151
  Description:
    End-to-end testing (dry-run by default):
    - Use example docs and a mocked Project to validate the full pipeline from parsing to planning/export.
    - Optional live run: with secure env vars, perform one real export and compare format.
    **Acceptance Criteria:**
    - Given the dry-run workflow, when executed, then no state-changing calls are made.
    - Given the optional live run, when performed, then exported files match expected templates.
    Tests:
      Integration:
        - Dry-run run-through with diagnostics captured
      E2E:
        - Live run optional script with diff check
