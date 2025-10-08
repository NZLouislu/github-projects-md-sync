import * as dotenv from "dotenv";
import * as path from "path";
import { projectToMd } from "../src/index";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  console.log("=== Sync GitHub Project to Markdown Files ===");
  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;
  if (!projectId || !token) {
    console.log("Missing PROJECT_ID or GITHUB_TOKEN");
    process.exit(0);
  }

  const arg = process.argv[2];
  const customDir = arg && !arg.startsWith("-") ? arg : path.join(__dirname, "items");

  const { result, logs } = await projectToMd(projectId, token, customDir);

  console.log("\n--- Logs ---");
  logs.forEach(log => {
    console.log(`[${log.level.toUpperCase()}] ${log.message}`, ...log.args);
  });
  console.log("------------\n");

  if (result.success) {
    console.log(`Project items synced to markdown files successfully in ${result.outputDir}!`);
    console.log(`Created/updated ${result.files.length} files.`);
  } else {
    console.error("Failed to sync project to markdown.");
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

export { run as projectToMarkdown };