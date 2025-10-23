import { strict as assert } from "assert";

describe("Bundled Product Test (import from dist)", () => {
  it("should import main export from dist without error", async () => {
    // Try both CommonJS and ESM default entry if available
    let mod: any = null;
    try {
      mod = require("../dist");
    } catch {
      // fallback: try dist/src or dist/utils known modules
      try {
        mod = require("../dist/src/markdown-to-project");
      } catch {
        // As last resort, ensure dist exists (covered by package-structure.test)
      }
    }
    assert.ok(mod !== null, "Should load module from dist");
  });
});