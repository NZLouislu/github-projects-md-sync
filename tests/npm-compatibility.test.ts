import { strict as assert } from "assert";

describe("NPM Package Compatibility Test", () => {
  it("should run under supported Node.js LTS (>=18)", () => {
    const major = parseInt(process.versions.node.split(".")[0], 10);
    assert.ok(major >= 18, "Node.js version must be >= 18");
  });
});