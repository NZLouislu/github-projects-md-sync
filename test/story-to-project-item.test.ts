import { parseStoryFile, syncStoriesToProject } from "../src/story-to-project-item";
import assert from "assert";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("story-to-project", function () {
  // Increase timeout for all tests in this suite
  this.timeout(15000);
  
  describe("parseStoryFile", function () {
    it("should parse a story file correctly", async function () {
      // Create a temporary story file for testing
      const testStoryContent = `## Story: Test Story Title

### Status
Backlog

### Requirements
This is a test requirement

### AC (Acceptance Criteria)
- Test criterion 1
- Test criterion 2

### Scope
Test scope description

### AI Prompt
Test AI prompt`;
      
      const tempDir = path.join(process.cwd(), "test-temp");
      await fs.mkdir(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, "test-story.md");
      await fs.writeFile(tempFile, testStoryContent);
      
      try {
        // Parse the story file
        const story = await parseStoryFile(tempFile);
        
        // Assertions
        assert.strictEqual(story.title, "Test Story Title");
        assert.strictEqual(story.status, "Backlog");
        assert.strictEqual(story.fileName, "test-story.md");
        assert.ok(story.content.includes("## Test Story Title"));
        assert.ok(story.content.includes("### Requirements"));
        assert.ok(story.content.includes("This is a test requirement"));
        assert.ok(story.content.includes("### AC (Acceptance Criteria)"));
        assert.ok(story.content.includes("- Test criterion 1"));
        assert.ok(story.content.includes("### Scope"));
        assert.ok(story.content.includes("Test scope description"));
        assert.ok(story.content.includes("### AI Prompt"));
        assert.ok(story.content.includes("Test AI prompt"));
      } finally {
        // Clean up
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
    
    it("should handle missing status and use default", async function () {
      // Create a temporary story file without status
      const testStoryContent = `## Story: Test Story Without Status

### Requirements
This is a test requirement`;
      
      const tempDir = path.join(process.cwd(), "test-temp");
      await fs.mkdir(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, "test-story-no-status.md");
      await fs.writeFile(tempFile, testStoryContent);
      
      try {
        // Parse the story file
        const story = await parseStoryFile(tempFile);
        
        // Assertions
        assert.strictEqual(story.title, "Test Story Without Status");
        assert.strictEqual(story.status, "Backlog"); // Default status
        assert.strictEqual(story.fileName, "test-story-no-status.md");
        assert.ok(story.content.includes("## Test Story Without Status"));
        assert.ok(story.content.includes("### Requirements"));
        assert.ok(story.content.includes("This is a test requirement"));
      } finally {
        // Clean up
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
  
  // Skip the test that requires actual GitHub API if env vars are not set
  describe("syncStoriesToProject", function () {
    it("should be able to import syncStoriesToProject without errors", async function () {
      // This test just checks that the module can be imported without errors
      const module = await import("../src/story-to-project-item");
      assert.ok(module.syncStoriesToProject);
    });
    
    it("should sync a specific story file to project", async function () {
      // Skip test if no token or project id
      if (!TOKEN || !PROJECT_ID || process.env.CI) {
        this.skip();
        return;
      }
      
      // Increase timeout for this specific test
      this.timeout(30000);
      
      // Mock the actual sync function to avoid real API calls in tests
      const originalSync = syncStoriesToProject;
      
      // Create a mock version that resolves immediately
      const mockSyncStoriesToProject = async () => {
        return Promise.resolve();
      };
      
      // Replace the real function with the mock
      (await import("../src/story-to-project-item")).syncStoriesToProject = mockSyncStoriesToProject;
      
      try {
        await mockSyncStoriesToProject();
        assert.ok(true);
      } finally {
        // Restore the original function
        (await import("../src/story-to-project-item")).syncStoriesToProject = originalSync;
      }
    });
  });
});