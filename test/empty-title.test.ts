import { parseStoryFile } from "../src/story-to-project-item";
import assert from "assert";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

describe("empty title handling", function () {
  it("should correctly parse story files with various formats", async function () {
    const storiesDir = path.join(process.cwd(), "stories");
    const files = await fs.readdir(storiesDir);
    
    for (const file of files) {
      if (file.endsWith(".md")) {
        const filePath = path.join(storiesDir, file);
        
        // Skip files that don't follow the story format (like todo-list-example.md)
        const fileContent = await fs.readFile(filePath, "utf8");
        if (!fileContent.startsWith("## Story: ")) {
          console.log(`Skipping ${file} as it doesn't follow the story format`);
          continue;
        }
        
        try {
          const story = await parseStoryFile(filePath);
          console.log(`File: ${file}, Title: "${story.title}", Story ID: ${story.storyId}`);
          
          // Check that title is not empty
          assert.ok(story.title && story.title.trim() !== "", `File ${file} should have a non-empty title`);
        } catch (error) {
          console.error(`Error parsing ${file}:`, error);
          assert.fail(`Failed to parse ${file}: ${error}`);
        }
      }
    }
  });
});