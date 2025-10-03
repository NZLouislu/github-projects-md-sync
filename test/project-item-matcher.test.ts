import { findProjectItemByStoryIdOrTitle } from "../src/utils/project-item-matcher";
import { ProjectBoardItem } from "../src/project-to-stories";
import assert from "assert";

describe("projectItemMatcher", function () {
  describe("findProjectItemByStoryIdOrTitle", function () {
    const mockItems: ProjectBoardItem[] = [
      {
        id: "1",
        title: "Item 1",
        url: "http://example.com/1",
        body: "Body 1",
        state: "OPEN",
        storyId: "story-1"
      },
      {
        id: "2",
        title: "Item 2",
        url: "http://example.com/2",
        body: "Body 2",
        state: "CLOSED",
        storyId: "story-2"
      },
      {
        id: "3",
        title: "Item 3",
        url: "http://example.com/3",
        body: "Body 3",
        state: "OPEN"
        // No storyId for this item
      },
      {
        id: "4",
        title: "Item 4",
        url: "http://example.com/4",
        body: "Body 4",
        state: "CLOSED",
        storyId: "story-4"
      }
    ];

    it("should find item by storyId when provided", function () {
      const result = findProjectItemByStoryIdOrTitle(mockItems, "story-2", "Item 1");
      assert.strictEqual(result, mockItems[1]);
    });

    it("should find item by title when storyId not provided", function () {
      const result = findProjectItemByStoryIdOrTitle(mockItems, undefined, "Item 3");
      assert.strictEqual(result, mockItems[2]);
    });

    it("should find item by storyId even when title also matches a different item", function () {
      const result = findProjectItemByStoryIdOrTitle(mockItems, "story-2", "Item 1");
      assert.strictEqual(result, mockItems[1]); // Should match storyId, not title
    });

    it("should return undefined when neither storyId nor title match", function () {
      const result = findProjectItemByStoryIdOrTitle(mockItems, "non-existent-story", "Non-existent item");
      assert.strictEqual(result, undefined);
    });

    it("should return undefined when items array is empty", function () {
      const result = findProjectItemByStoryIdOrTitle([], "story-1", "Item 1");
      assert.strictEqual(result, undefined);
    });

    it("should return undefined when no parameters provided", function () {
      const result = findProjectItemByStoryIdOrTitle(mockItems);
      assert.strictEqual(result, undefined);
    });

    it("should return undefined when storyId is null and title is undefined", function () {
      const result = findProjectItemByStoryIdOrTitle(mockItems, null as any, undefined);
      assert.strictEqual(result, undefined);
    });
  });
});