import { strict as assert } from "assert";
import fs from "fs/promises";
import path from "path";

describe("Documentation presence and structure", () => {
  it("deprecation doc includes required sections", async () => {
    const p = path.join(process.cwd(), "docs", "deprecation.md");
    const s = await fs.readFile(p, "utf8");
    assert.match(s, /Deprecation Notice/i);
    assert.match(s, /Rollback Switch/i);
    assert.match(s, /Risks and Limitations/i);
    assert.match(s, /Migration Path/i);
  });

  it("accessibility doc includes TOC and headings", async () => {
    const p = path.join(process.cwd(), "docs", "accessibility.md");
    const s = await fs.readFile(p, "utf8");
    assert.match(s, /## TOC/);
    assert.match(s, /## Heading Hierarchy/);
    assert.match(s, /## Screen Reader Order/);
    assert.match(s, /## FAQ/);
  });
});