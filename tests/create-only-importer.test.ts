import { strict as assert } from "assert";
import { planCreateOnlyImportFromMarkdown } from "../src/utils/create-only-importer";

describe("Create-Only Importer (md→project)", () => {
  it("new id → create; existing id → skip", () => {
    const md = [
      "## Ready",
      "- Story: Title A",
      "  story id: X-1",
      "  description:",
      "    line a",
      "- Story: Title B",
      "  story id: X-2",
      "  description:",
      "    line b",
    ].join("\n");

    const res = planCreateOnlyImportFromMarkdown(md, "mem.md", { existingIds: new Set(["X-2"]) });
    assert.equal(res.errors.length, 0);
    assert.equal(res.warnings.length, 0);
    const creates = res.plans.filter(p => p.action === "create");
    const skips = res.plans.filter(p => p.action === "skip");
    assert.equal(creates.length, 1);
    assert.equal(skips.length, 1);
    assert.equal(creates[0].story.id, "X-1");
    assert.equal(skips[0].story.id, "X-2");
  });

  it("invalid parsed item → Errors+1 (missing id)", () => {
    const md = [
      "## Backlog",
      "- Story: NoID",
      "  description:",
      "    x",
    ].join("\n");

    const res = planCreateOnlyImportFromMarkdown(md, "mem.md");
    assert.equal(res.errors.length, 1);
    assert.match(res.errors[0].message, /Missing ID/i);
    assert.equal(res.stats.errors, 1);
  });

  it("preserves description and derives status by section", () => {
    const md = [
      "## In progress",
      "- Story: Title C",
      "  story id: X-3",
      "  description:",
      "    - a",
      "    code:",
      "      - b",
    ].join("\n");
    const res = planCreateOnlyImportFromMarkdown(md, "mem.md");
    assert.equal(res.errors.length, 0);
    assert.equal(res.plans.length, 1);
    assert.equal(res.plans[0].story.status, "In progress");
    assert.equal(res.plans[0].story.description.trim(), ["- a", "code:", "  - b"].join("\n"));
  });
});