## Story: Bundled Product Test

### Story ID

Story-0164

### Status

In review

### Description

Directly test the functionality of the code in the `dist` directory.
- Import and use modules directly from `dist` to verify post-build functionality.
- Ensure all bundled formats (e.g., CommonJS, ES Modules) work as expected.
  **Acceptance Criteria:**
- Given the `dist` directory, when modules are imported directly from it, then they function correctly.
- Given multiple bundled formats, when each is tested, then they all work as intended.
  Tests:
  Unit:
  - N/A
    Integration:
  - Small test suite that imports and runs basic functions from `dist` files.
    E2E:
  - N/A
