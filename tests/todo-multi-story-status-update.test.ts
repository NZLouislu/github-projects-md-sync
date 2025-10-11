import { createSyncRequestObject } from "../src/markdown-to-project";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("todo list multi-story single-run status update", function () {
  this.timeout(15000);

  before(function () {
    if (!TOKEN || !PROJECT_ID || process.env.CI) {
      this.skip();
    }
  });

  it("should include both UpdateDraftIssue and UpdateProjectItemField in one run when content changed and status changed", async function () {
    const CODE = `## Ready

- Story: story3 for testing to do list md
  - Initial line

## In review

- Story: Implement core functionality
  - Design API endpoints

## In progress

- Story: Develop UI components
  - Create mockups
`;

    const result = await createSyncRequestObject(CODE, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });

    const hasUpdateDraftIssue = result.some(
      (i: any) => i.__typename === "UpdateDraftIssue" && i.title === "Story: story3 for testing to do list md"
    );

    const hasStatusUpdate = result.some(
      (i: any) =>
        i.__typename === "UpdateProjectItemField" &&
        typeof i.value === "object" &&
        i.value !== null &&
        "singleSelectOptionId" in i.value
    );

    if (!hasUpdateDraftIssue || !hasStatusUpdate) {
      console.log("Result items:", result);
    }

    // 同时包含内容更新与状态更新，避免需要跑两次
    if (!hasUpdateDraftIssue || !hasStatusUpdate) {
      throw new Error("Expected both UpdateDraftIssue and UpdateProjectItemField in a single run");
    }
  });
});