import * as dotenv from "dotenv";
import * as path from "path";
import { mdToProject } from "../src/index";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  console.log("=== Sync Markdown Files to GitHub Project ===");
  const mdDir = path.join(__dirname, "md");
  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;
  if (!projectId || !token) {
    console.log("Missing PROJECT_ID or GITHUB_TOKEN");
    process.exit(0);
  }
  const { result, logs } = await mdToProject(projectId, token, mdDir);
  
  console.log("\n--- Logs ---");
  logs.forEach(log => {
    console.log(`[${log.level.toUpperCase()}] ${log.message}`, ...log.args);
  });
  console.log("------------\n");

  if (result.success) {
    console.log("Successfully synced markdown directory!");
    console.log(`Processed ${result.processedFiles} files (${result.storyCount} stories, ${result.todoCount} todo lists).`);
  } else {
    console.error("Failed to sync markdown directory.");
    if (result.errors.length > 0) {
      console.error("\n--- Errors ---");
      result.errors.forEach(error => {
        console.error(`[${error.level.toUpperCase()}] ${error.message}`, ...error.args);
      });
      console.error("--------------\n");
    }
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
  });
}

export { run as syncMarkdownFilesToProject };