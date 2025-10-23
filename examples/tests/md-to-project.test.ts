import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { syncMarkdownFilesToProject } from "../md-to-project";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

describe("Sync Markdown Files to Project via md-to-project.ts", () => {
  const testMdDir = path.resolve(__dirname, "../md");

  it("should execute syncMarkdownFilesToProject function and sync markdown files to project", async function() {
    // Skip if no GitHub token or project ID
    if (!process.env.GITHUB_TOKEN || !process.env.PROJECT_ID) {
      console.log("Skipping sync test: Missing GITHUB_TOKEN or PROJECT_ID environment variables");
      this.skip();
      return;
    }

    this.timeout(30000); // Increase timeout for this test

    try {
      console.log("Starting sync via direct function call...");
      await syncMarkdownFilesToProject();
      console.log("Markdown files synced successfully via function call");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Sync failed: ${message}`);
    }
  });

  it("should verify that markdown files exist in examples/md directory", async () => {
    const files = await fs.readdir(testMdDir);
    const mdFiles = files.filter(file => file.endsWith(".md"));

    if (mdFiles.length === 0) {
      throw new Error("No markdown files found in examples/md directory");
    }

    console.log(`Found markdown files: ${mdFiles.join(", ")}`);

    // Verify multi-story file exists for v0.1.11
    const expectedFiles = ["test-multi-stories-0.1.11.md"];
    for (const expectedFile of expectedFiles) {
      if (!mdFiles.includes(expectedFile)) {
        throw new Error(`Expected markdown file ${expectedFile} not found`);
      }
    }
  });

  it("should validate markdown content structure", async () => {
    const storyFile = path.join(testMdDir, "test-multi-stories-0.1.11.md");
    const content = await fs.readFile(storyFile, "utf8");

    // Check for expected headings
    const expectedHeadings = ["## Ready", "## In progress", "## In review", "## Backlog", "## Done"];
    const hasAnySection = expectedHeadings.some(h => content.includes(h));
    if (!hasAnySection) {
      throw new Error("No standard story sections found in test-multi-stories-0.1.11.md (expected one of: Ready/In progress/In review/Backlog/Done)");
    }

    // Check for task items
    if (!content.includes("Story:")) {
      throw new Error("No story items found in test-multi-stories-0.1.11.md");
    }

    console.log("Markdown content structure validated successfully");
  });
});