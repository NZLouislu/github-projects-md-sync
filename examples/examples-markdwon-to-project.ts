import * as fs from "fs/promises";
import * as path from "path";
import { syncToProject, parseStoryFile } from "../src/index";
import { createOrUpdateProjectItem } from "../src/story-to-project-item";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function syncMarkdownFilesToProject() {
  console.log("=== Sync Markdown Files to GitHub Project ===");

  const mdDir = path.join(__dirname, "md");
  const files = await fs.readdir(mdDir);
  const mdFiles = files.filter(file => file.endsWith('.md'));

  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;

  if (!projectId || !token) {
    console.error("Missing PROJECT_ID or GITHUB_TOKEN in environment variables");
    return;
  }

  const options = {
    projectId,
    token,
    includesNote: true
  };

  for (const file of mdFiles) {
    try {
      const filePath = path.join(mdDir, file);
      const markdownContent = await fs.readFile(filePath, "utf8");

      console.log(`Syncing ${file} to GitHub project...`);

      // Check if this is a story file (starts with "## Story: ")
      if (markdownContent.trim().startsWith("## Story: ")) {
        // Use story sync logic for story files
        const story = await parseStoryFile(filePath);
        await createOrUpdateProjectItem(projectId, story, token);
      } else {
        // Use task list sync logic for other markdown files
        await syncToProject(markdownContent, options);
      }

      console.log(`Successfully synced ${file}!`);
    } catch (error) {
      console.error(`Failed to sync ${file}:`, error);
    }
  }
}

if (require.main === module) {
  syncMarkdownFilesToProject().catch(console.error);
}

export { syncMarkdownFilesToProject };