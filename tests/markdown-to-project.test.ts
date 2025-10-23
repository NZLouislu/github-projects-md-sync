import {
  createSyncRequestObject,
  syncToProject,
} from "../src/markdown-to-project";
import * as githubService from "../src/github-service";
import assert from "assert";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

// Load .env file
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("markdown-to-project", function () {
  // Increase timeout for tests
  this.timeout(10000);
  
  // Skip all tests in CI environment or when no token is provided
  before(function() {
    if (!TOKEN || process.env.CI) {
      // this.skip();
    }
  });

  describe("create-only logic", () => {
    it("should skip creating items that already exist by storyId", async function () {
      if (!PROJECT_ID) this.skip();

      // 1. Mock the fetchProjectBoard function
      const originalFetchProjectBoard = githubService.fetchProjectBoard;
      (githubService as any).fetchProjectBoard = async () => {
        console.log("Using mocked fetchProjectBoard");
        return {
          id: "mock-project-id",
          name: "Mock Project",
          columns: [
            {
              id: "col1",
              name: "Backlog",
              items: [
                {
                  id: "item1",
                  title: "An Existing Story",
                  body: "story-id: existing-story-id",
                  storyId: "existing-story-id", // Manually set for the mock
                  state: "OPEN",
                  url: undefined
                },
              ],
            },
          ],
        };
      };

      try {
        // 2. Define markdown with one existing and one new story
        const markdown = `
## Backlog

- [ ] An Existing Story
    story-id: existing-story-id

- [ ] A New Story
    story-id: new-story-id
`;

        // 3. Call the function to get the request object
        const requests = await createSyncRequestObject(markdown, {
          projectId: PROJECT_ID,
          token: TOKEN,
          includesNote: true,
        });

        // 4. Assert the results
        const newDraftIssues = requests.filter(r => r.__typename === "NewDraftIssue");
        
        assert.strictEqual(newDraftIssues.length, 1, "Should only plan to create one new issue");
        
        const newStoryRequest = newDraftIssues[0] as any;
        assert.strictEqual(newStoryRequest.title, "A New Story", "The new issue should be for the new story");

      } finally {
        // 5. Restore the original function
        (githubService as any).fetchProjectBoard = originalFetchProjectBoard;
        console.log("Restored fetchProjectBoard");
      }
    });
  });

  it("should get request object", async function () {
    const CODE = `## To do

- [ ] [Note A](https://github.com/nzlouis/github-projects-md-sync/projects/1#card-70939527)
    - Details Note A
    - [link](https://example.com)
- [x] [TODO ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/4)

## Ready

- [ ] [READY ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/6)
    - This is ready to be picked up

## In progress

- [x] [PROGRESS ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/3)


## Done

- [x] [DONE ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/5)
`;

    // Test with legacy API
    if (!PROJECT_ID) {
      const request = await createSyncRequestObject(CODE, {
        owner: "nzlouis",
        repo: "github-projects-md-sync",
        projectNumber: 1,
        token: TOKEN,
        includesNote: true,
      });
      console.log("Legacy API request:", request);
    }
    // Test with V2 API
    else {
      const request = await createSyncRequestObject(CODE, {
        projectId: PROJECT_ID,
        token: TOKEN,
        includesNote: true,
      });
      console.log("V2 API request:", request);
    }
  });

  it("should sync with linked note", async function () {
    const CODE = `## To do

- [ ] [Note A](https://github.com/nzlouis/github-projects-md-sync/projects/1#card-70939527)
    - Details Note A
    - [link](https://example.com)
- [ ] [TODO ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/4)


## In progress

- [ ] [PROGRESS ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/3)

## Done

- [x] [DONE ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/5)
`;

    // Test with legacy API
    if (!PROJECT_ID) {
      await syncToProject(CODE, {
        owner: "nzlouis",
        repo: "github-projects-md-sync",
        projectNumber: 1,
        token: TOKEN,
        includesNote: true,
      });
    }
    // Test with V2 API
    else {
      // Create a mock CODE without linked note URLs to avoid using invalid IDs
      const mockCODE = `## To do

- [ ] Note A
    - Details Note A
    - [link](https://example.com)
- [ ] TODO ISSUE

## Ready

- [ ] READY ISSUE
    - This is ready to be picked up

## In progress

- [ ] PROGRESS ISSUE

## Done

- [x] DONE ISSUE
`;
      await syncToProject(mockCODE, {
        projectId: PROJECT_ID,
        token: TOKEN,
        includesNote: true,
      });
    }
  });

  it("should sync without linked note", async function () {
    const CODE = `## To do

- [x] Note cccc
    - testa
    - asa
    asdsa
- [ ] Note A
    - [ ] Details Note Axxxxx
    - [link](https://example.com)
- [ ] [TODO ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/4)


## In progress

- [ ] [PROGRESS ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/3)


## Done

- [x] [DONE ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/5)
`;

    // Test with legacy API
    if (!PROJECT_ID) {
      await syncToProject(CODE, {
        owner: "nzlouis",
        repo: "github-projects-md-sync",
        projectNumber: 1,
        token: TOKEN,
        includesNote: true,
      });
    }
    // Test with V2 API
    else {
      // Create a mock CODE without linked note URLs to avoid using invalid IDs
      const mockCODE = `## To do

- [x] Note cccc
    - testa
    - asa
    asdsa
- [ ] Note A
    - [ ] Details Note Axxxxx
    - [link](https://example.com)
- [ ] TODO ISSUE

## In progress

- [ ] PROGRESS ISSUE

## Done

- [x] DONE ISSUE
`;
      await syncToProject(mockCODE, {
        projectId: PROJECT_ID,
        token: TOKEN,
        includesNote: true,
      });
    }
  });

  it("should handle Ready status correctly", async function () {
    // Skip test if no token or project id
    if (!TOKEN || !PROJECT_ID) {
      this.skip();
      return;
    }

    const CODE = `## Backlog

- [ ] Backlog task
    - This is in backlog

## Ready

- [ ] Ready task
    - This is ready to be picked up
- [ ] Another ready task

## In progress

- [ ] In progress task

## Done

- [x] Done task
`;

    // Test with V2 API - this will create new draft issues and test status updates
    const request = await createSyncRequestObject(CODE, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });
    
    console.log("Request items:", request);
    
    // Look for NewDraftIssue items that should have been created for Ready tasks
    const newDraftIssues = request.filter((item: any) => 
      item.__typename === "NewDraftIssue" && 
      (item.title === "Ready task" || item.title === "Another ready task")
    );
    
    console.log("New draft issues for Ready tasks:", newDraftIssues);
    
    // Look for status update items
    const statusUpdates = request.filter((item: any) => 
      item.__typename === "UpdateProjectItemField"
    );
    
    console.log("Status updates:", statusUpdates);
  });
});

describe("sync todo list example", function () {
  // Increase timeout for tests
  this.timeout(10000);
  
  it("should sync todo-list-example.md to project", async function () {
    // Skip test if no token or project id or in CI environment
    if (!TOKEN || !PROJECT_ID || process.env.CI) {
      this.skip();
      return;
    }

    // Read the todo list example file
    const filePath = path.join(__dirname, "../stories/todo-list-example.md");
    const markdownContent = await fs.readFile(filePath, "utf8");

    // Sync to project
    await syncToProject(markdownContent, {
      projectId: PROJECT_ID,
      token: TOKEN,
      includesNote: true,
    });

    console.log("Successfully synced todo-list-example.md to project");
  });
});
