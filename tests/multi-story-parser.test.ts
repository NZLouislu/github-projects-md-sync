import { strict as assert } from "assert";
import fs from "fs";
import path from "path";
import { parseStoriesFromMarkdown } from "../src/utils/multi-story-parser";

describe("Multi-Story Parser", () => {
  it("maps known sections and unknown section to Backlog", () => {
    const md = [
      "## Unknown Section",
      "",
      "- Story: A",
      "  story id: S-1",
      "  description:",
      "    line1",
      "",
      "## In progress",
      "",
      "- Story: B",
      "  story id: S-2",
      "  description:",
      "    b1",
    ].join("\n");
    const res = parseStoriesFromMarkdown(md, "mem.md");
    assert.equal(res.errors.length, 0);
    const byId = new Map(res.stories.map(s => [s.id, s]));
    assert.equal(byId.get("S-1")!.status, "Backlog");
    assert.equal(byId.get("S-2")!.status, "In progress");
  });

  it("uses field keys as boundaries and preserves description markdown", () => {
    const md = [
      "## Backlog",
      "- Story: Title X",
      "  story id: IDX",
      "  description:",
      "    - a",
      "    - b",
      "    code:",
      "      - not a field, still desc",
      "  unknownkey: value",
    ].join("\n");
    const res = parseStoriesFromMarkdown(md, "mem.md");
    assert.equal(res.errors.length, 0);
    assert.equal(res.warnings.length, 1);
    assert.match(res.warnings[0].message, /Unknown field key/i);
    assert.equal(res.stories.length, 1);
    assert.equal(res.stories[0].title, "Title X");
    assert.equal(res.stories[0].description.trim(), ["- a", "- b", "code:", "  - not a field, still desc"].join("\n"));
  });

  it("records error on missing ID and skips it; duplicate ID warns and skips duplicates", () => {
    const md = [
      "## Ready",
      "- Story: T1",
      "  description:",
      "    a",
      "- Story: T2",
      "  story id: D1",
      "  description:",
      "    b",
      "- Story: T3",
      "  story id: D1",
      "  description:",
      "    c",
    ].join("\n");
    const res = parseStoriesFromMarkdown(md, "x.md");
    assert.equal(res.errors.length, 1);
    assert.match(res.errors[0].message, /Missing ID/i);
    assert.equal(res.stories.length, 1);
    assert.equal(res.stories[0].id, "D1");
    assert.equal(res.warnings.length, 1);
    assert.match(res.warnings[0].message, /Duplicate ID/i);
  });

  it("integration: parses sample doc deterministically and collects diagnostics", () => {
    const file = path.join(__dirname, "../stories/test-multi-stories-0.1.11.md");
    const content = fs.readFileSync(file, "utf8");
    const res = parseStoriesFromMarkdown(content, file);
    assert.ok(res.stories.length >= 5);
    assert.ok(Array.isArray(res.errors));
    assert.ok(Array.isArray(res.warnings));
  });
});