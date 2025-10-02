import { extractStoryId, normalizeKey } from "../src/utils/storyId";
import assert from "assert";

describe("storyId utils", function () {
  describe("normalizeKey", function () {
    it("should normalize keys correctly", function () {
      assert.strictEqual(normalizeKey("storyId"), "storyid");
      assert.strictEqual(normalizeKey("Story ID"), "storyid");
      assert.strictEqual(normalizeKey("story_id"), "storyid");
      assert.strictEqual(normalizeKey("story-id"), "storyid");
      assert.strictEqual(normalizeKey("story id"), "storyid");
      assert.strictEqual(normalizeKey("STORY_ID"), "storyid");
    });
  });

  describe("extractStoryId", function () {
    it("should extract storyId from different keys", function () {
      const fm1 = { "story id": "abc" };
      const fm2 = { storyId: "def" };
      const fm3 = { STORY_ID: "ghi" };
      const fm4 = { "story_id": "jkl" };
      const fm5 = { "story-id": "mno" };

      assert.strictEqual(extractStoryId(fm1, "file.md"), "abc");
      assert.strictEqual(extractStoryId(fm2, "file.md"), "def");
      assert.strictEqual(extractStoryId(fm3, "file.md"), "ghi");
      assert.strictEqual(extractStoryId(fm4, "file.md"), "jkl");
      assert.strictEqual(extractStoryId(fm5, "file.md"), "mno");
    });

    it("should fallback to file name", function () {
      const fm = {};
      assert.strictEqual(extractStoryId(fm, "login-reset.md"), "mdsync-login-reset");
    });

    it("should handle empty frontmatter", function () {
      assert.strictEqual(extractStoryId({}, "test-file.md"), "mdsync-test-file");
    });

    it("should handle undefined frontmatter values", function () {
      const fm = { "storyId": undefined };
      assert.strictEqual(extractStoryId(fm, "another-file.md"), "mdsync-another-file");
    });
  });
});