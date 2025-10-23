import { strict as assert } from "assert";
import { generateIdPatches } from "../src/tools/id-injection";

describe("One-Time ID Injection Tool", () => {
  it("should suggest ids for stories missing id", () => {
    const md = [
      "## Ready",
      "- Story: Add Property Search and Filter Functions",
      "  description:",
      "    ...",
      "- Story: Project initialization",
      "  story id: proj-init-1",
    ].join("\n");

    const patches = generateIdPatches(md, "mem.md");
    assert.equal(patches.length, 1);
    assert.equal(patches[0].title, "Add Property Search and Filter Functions");
    assert.match(patches[0].suggestedId, /add-property-search-and-filter-functions/);
  });

  it("should not suggest when id exists", () => {
    const md = [
      "## Backlog",
      "- Story: Setup project structure",
      "  story id: setup-structure-1",
    ].join("\n");
    const patches = generateIdPatches(md, "mem.md");
    assert.equal(patches.length, 0);
  });
});