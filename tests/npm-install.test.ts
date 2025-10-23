import { strict as assert } from "assert";

describe("NPM Package Installation Test (local import simulation)", () => {
  it("should resolve main export after build", async () => {
    let loaded: any = null;
    try {
      loaded = require("../dist/index.js");
    } catch {
      try {
        loaded = require("../dist/src/markdown-to-project.js");
      } catch {}
    }
    assert.ok(loaded !== null, "dist main should be importable");
  });
});