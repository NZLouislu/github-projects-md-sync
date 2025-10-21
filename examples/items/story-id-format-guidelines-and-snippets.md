## Story: Story: ID Format Guidelines and Snippets

### Status

In review

### Description

story id: Story 0131-IdGuidelines
description:
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
