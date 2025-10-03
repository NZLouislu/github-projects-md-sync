import {
  createSyncRequestObject
} from "../src/markdown-to-project";
import { fetchProjectBoard } from "../src/project-to-stories";
import assert from "assert";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("duplicate items handling", function () {
  // Increase timeout for tests
  this.timeout(15000);
  
  // Skip all tests in CI environment or when no token is provided
  before(function() {
    if (!TOKEN || !PROJECT_ID || process.env.CI) {
      this.skip();
    }
  });

  it("should not create duplicate items for existing issues", async function () {
    // First, check the current state of the project
    const projectBefore = await fetchProjectBoard({
      projectId: PROJECT_ID,
      token: TOKEN
    });
    
    console.log("Project items before sync:");
    let noteACount = 0;
    let progressIssueCount = 0;
    let doneIssueCount = 0;
    
    projectBefore.columns.forEach(column => {
      column.items.forEach(item => {
        console.log(`Item: "${item.title}" in column "${column.name}"`);
        if (item.title.trim() === "Note A") noteACount++;
        if (item.title.trim() === "PROGRESS ISSUE") progressIssueCount++;
        if (item.title.trim() === "DONE ISSUE") doneIssueCount++;
      });
    });
    
    console.log(`Note A count: ${noteACount}`);
    console.log(`PROGRESS ISSUE count: ${progressIssueCount}`);
    console.log(`DONE ISSUE count: ${doneIssueCount}`);
    
    const CODE = `## To do

- [ ] Note A
    - Details Note A
    - [link](https://example.com)
- [ ] TODO ISSUE

## In progress

- [ ] PROGRESS ISSUE

## Done

- [x] DONE ISSUE
`;

    // Run the sync 
    console.log("\nSyncing:");
    const request = await createSyncRequestObject(CODE, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });
    
    console.log("Requests from sync:");
    request.forEach((req, index) => {
      console.log(`${index}: ${req.__typename} - ${'title' in req ? req.title : 'N/A'}`);
    });
    
    // Count UpdateDraftIssue vs NewDraftIssue requests
    const updateDraftIssues = request.filter(item => item.__typename === "UpdateDraftIssue");
    const newDraftIssues = request.filter(item => item.__typename === "NewDraftIssue");
    
    console.log(`\nUpdate draft issues: ${updateDraftIssues.length}`);
    console.log(`New draft issues: ${newDraftIssues.length}`);
    
    // Test assertion
    assert.strictEqual(newDraftIssues.length, 4, "Should create 4 new draft issues");
  });
});