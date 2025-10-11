import { syncToProject } from "../src/markdown-to-project";
import { fetchProjectBoard } from "../src/github-service";
import dotenv from "dotenv";
import assert from "assert";

dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("integration: move story3 from Ready to In review in single run", function () {
  this.timeout(30000);

  before(function () {
    if (!TOKEN || !PROJECT_ID || process.env.CI) {
      this.skip();
    }
  });

  const story3Title = "Story: story3 for testing to do list md";

  it("should place story3 under In review after a single sync when moved from Ready", async function () {
    const mdReady = `## Ready

- ${story3Title}
  - Step A
  - Step B
`;

    await syncToProject(mdReady, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });

    const mdInReview = `## In review

- ${story3Title}
  - Step A
  - Step B
`;

    await syncToProject(mdInReview, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });

    const board = await fetchProjectBoard({ projectId: PROJECT_ID, token: TOKEN });
    const inReviewCol = board.columns.find(c => c.name === "In review");
    assert.ok(inReviewCol, 'Column "In review" should exist');

    const found = (inReviewCol?.items || []).some(it => it.title === story3Title);
    assert.ok(found, 'story3 should be in "In review" after a single sync run');
  });
});