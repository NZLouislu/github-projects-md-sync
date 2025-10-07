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
  await mdToProject(projectId, token, mdDir);
  console.log("Successfully synced markdown directory!");
}
if (require.main === module) {
  run().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
export { run as syncMarkdownFilesToProject };