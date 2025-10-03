import {
  createSyncRequestObject
} from "../src/markdown-to-project";
import assert from "assert";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("done items handling", function () {
  // Increase timeout for tests
  this.timeout(10000);

  it("should create draft issues for done items", async function () {
    // Skip test if no token or project id
    if (!TOKEN || !PROJECT_ID || process.env.CI) {
      this.skip();
      return;
    }

    const CODE = `## Done

- [x] Story: Setup project structure
  - Initialize repository
  - Configure build tools
  - Setup CI/CD pipeline
`;

    const request = await createSyncRequestObject(CODE, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });

    // Should have at least one NewDraftIssue for the done item
    const hasNewDraftIssue = request.some(item => item.__typename === "NewDraftIssue");
    
    // This test will likely fail, showing the bug
    assert.strictEqual(hasNewDraftIssue, true, "Should create draft issue for done items");
  });

  it("should properly set status for done items", async function () {
    // Skip test if no token or project id
    if (!TOKEN || !PROJECT_ID || process.env.CI) {
      this.skip();
      return;
    }

    const CODE = `## Done

- [x] Test done item
`;

    const request = await createSyncRequestObject(CODE, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });

    // Should have an UpdateProjectItemField to set the status to Done
    const statusUpdate = request.find(item => 
      item.__typename === "UpdateProjectItemField" && 
      typeof item.value === "object" && 
      item.value !== null && 
      "singleSelectOptionId" in item.value
    );

    // This test will likely fail, showing the bug
    assert.notStrictEqual(statusUpdate, undefined, "Should have status update for done items");
  });
});