## Story: Story: Project Export Filters (project→md)

### Status

In review

### Description

story id: Story 0121-ExportFilters
description:
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


