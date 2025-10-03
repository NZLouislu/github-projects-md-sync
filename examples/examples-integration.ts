import * as dotenv from "dotenv";
import { syncToProject, fetchProjectBoard, toMarkdown } from "../src/index";

// Load environment variables
dotenv.config();

async function exampleSyncStories() {
  console.log("=== Example: Sync Story Files to GitHub Project ===");
  
  try {
    // This will sync all story files from the 'stories' directory by default
    // Only run this example if you want to sync the default stories directory
    // await syncStoriesToProject();
    console.log("Stories sync example - not executed by default");
  } catch (error) {
    console.error("Failed to sync stories:", error);
  }
}

async function exampleSyncMarkdown() {
  console.log("=== Example: Sync Markdown Content to GitHub Project ===");
  
  // Example markdown content
  const markdownContent = `
## To Do
- [ ] Implement user authentication
- [ ] Design database schema

## In Progress
- [ ] Create API endpoints

## Done
- [x] Project setup
- [x] Environment configuration
  `;
  
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
  
  try {
    await syncToProject(markdownContent, options);
    console.log("Markdown synced successfully!");
  } catch (error) {
    console.error("Failed to sync markdown:", error);
  }
}

async function exampleProjectToMarkdown() {
  console.log("=== Example: Export GitHub Project to Markdown ===");
  
  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;
  
  if (!projectId || !token) {
    console.error("Missing PROJECT_ID or GITHUB_TOKEN in environment variables");
    return;
  }
  
  try {
    const projectBoard = await fetchProjectBoard({ projectId, token });
    const markdown = toMarkdown(projectBoard);
    console.log("Project exported to Markdown:");
    console.log(markdown);
  } catch (error) {
    console.error("Failed to export project to markdown:", error);
  }
}

async function exampleExportProjectToStories() {
  console.log("=== Example: Export GitHub Project Items to Story Files ===");
  
  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;
  
  if (!projectId || !token) {
    console.error("Missing PROJECT_ID or GITHUB_TOKEN in environment variables");
    return;
  }
  
  try {
    // Export project items to the 'stories' directory by default
    // Only run this example if you want to export project items to the default stories directory
    // await generateStoriesFromProject({ projectId, token });
    console.log("Project items export example - not executed by default");
  } catch (error) {
    console.error("Failed to export project items to stories:", error);
  }
}

// Run examples
async function runExamples() {
  await exampleSyncStories();
  await exampleSyncMarkdown();
  await exampleProjectToMarkdown();
  await exampleExportProjectToStories();
}

if (require.main === module) {
  runExamples().catch(console.error);
}

export { exampleSyncStories, exampleSyncMarkdown, exampleProjectToMarkdown, exampleExportProjectToStories, runExamples };