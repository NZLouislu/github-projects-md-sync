import {
  createSyncRequestObject,
  syncToProject,
} from "../src/markdown-to-project";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

// Load .env file
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("project-to-markdown", function () {
  // Increase timeout for tests
  this.timeout(10000);
  
  // Skip all tests in CI environment or when no token is provided
  before(function() {
    if (!TOKEN || process.env.CI) {
      this.skip();
    }
  });

  it("should get request object", async function () {
    const CODE = `## To do

- [ ] [Note A](https://github.com/nzlouis/github-projects-md-sync/projects/1#card-70939527)
    - Details Note A
    - [link](https://example.com)
- [x] [TODO ISSUE](https://github.com/nzlouis/github-projects-md-sync/issues/4)


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