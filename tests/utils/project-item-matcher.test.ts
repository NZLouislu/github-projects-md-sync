import { strict as assert } from "assert";
import { findProjectItemByStoryIdOrTitle } from "../../src/utils/project-item-matcher";

type Item = { storyId?: string; title: string };

describe("project-item-matcher", () => {
  const items: Item[] = [
    { storyId: "S-1", title: "Alpha" },
    { storyId: "S-2", title: "Beta" },
    { title: "Gamma" },
  ] as any;

  it("matches by storyId first", () => {
    const hit = findProjectItemByStoryIdOrTitle(items as any, "S-2", "Alpha");
    assert.equal(hit?.title, "Beta");
  });

  it("falls back to title when no storyId provided", () => {
    const hit = findProjectItemByStoryIdOrTitle(items as any, undefined, "Gamma");
    assert.equal(hit?.title, "Gamma");
  });

  it("returns undefined when no match", () => {
    const hit = findProjectItemByStoryIdOrTitle(items as any, "NA", "NA");
    assert.equal(hit, undefined);
  });
});