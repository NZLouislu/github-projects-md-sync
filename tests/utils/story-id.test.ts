import { strict as assert } from "assert";
import path from "path";
import { normalizeKey, extractStoryId } from "../../src/utils/story-id";

describe("story-id utils", () => {
  it("normalizeKey strips separators and lowercases", () => {
    assert.equal(normalizeKey("Story-ID"), "storyid");
    assert.equal(normalizeKey(" STORY_id "), "storyid");
    assert.equal(normalizeKey(""), "");
  });

  it("extractStoryId reads from frontmatter storyId (case-insensitive)", () => {
    const fm: any = { "Story Id": 12345 };
    const id = extractStoryId(fm, "/tmp/a.md");
    assert.equal(id, "12345");
  });

  it("extractStoryId falls back to filename when missing", () => {
    const fm: any = {};
    const id = extractStoryId(fm, path.join(process.cwd(), "foo-bar.md"));
    assert.ok(id.startsWith("mdsync-"));
    assert.ok(id.endsWith("foo-bar"));
  });
});