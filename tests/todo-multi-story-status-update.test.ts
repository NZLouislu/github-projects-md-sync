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
  Story ID: story3-for-testing
  Description:
    Initial line

## In review

- Story: Implement core functionality
  Story ID: story-implement-core
  Description:
    Design API endpoints

## In progress

- Story: Develop UI components
  Story ID: story-develop-ui
  Description:
    Create mockups
`;

    const result = await createSyncRequestObject(CODE, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });

    const draftIssues = result.filter((i: any) => i.__typename === "NewDraftIssue");
    const statusUpdates = result.filter((i: any) => i.__typename === "UpdateProjectItemField");

    if (!draftIssues.length || !statusUpdates.length) {
      console.log("Result items:", result);
      throw new Error("Expected both DraftIssue creations and status updates in a single run");
    }
  });
});