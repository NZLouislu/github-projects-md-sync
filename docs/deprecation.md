# Deprecation Notice: src/story-to-project-item.ts

## Summary
The legacy entry src/story-to-project-item.ts is deprecated. Please use the new parse/import/export pipeline.

## Risks and Limitations
- Inconsistent status mapping in the old flow
- Missing unified logging and dry-run support
- Prone to duplicates and unpredictable changes

## Rollback Switch (Emergency Only)
- Scenario: enable the old flow temporarily only in emergencies
- Boundaries: read-only / limited to specific files / time-boxed (no more than 24 hours)
- Steps:
  1. Turn off the new flow switch in CI
  2. Run the legacy script once
  3. Immediately restore the new flow and record changes

## Migration Path
- Use the new multi-story parser
- Use the Create-Only importer
- Use project export filters and the single-story template

## References
- New flow specification: stories/test-multi-stories-0.1.11.md
- Unified logging and dry-run: src/types.ts, src/markdown-to-project.ts