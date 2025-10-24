## Story: Deprecation Notice and Rollback Switch

### Story ID

Story-0133

### Status

In review

### Description

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
