import * as dotenv from "dotenv";
import * as path from "path";
import { projectToMd } from "../src/index";
export { projectToMd };
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const projectId = process.env.PROJECT_ID;
const token = process.env.GITHUB_TOKEN;
if (!projectId || !token) {
  console.log("Missing PROJECT_ID or GITHUB_TOKEN");
  process.exit(0);
}
const arg = process.argv[2];
const customDir = arg && !arg.startsWith("-") ? arg : path.join(__dirname, "items");
projectToMd(projectId, token, customDir)
  .then(() => {
    console.log("Project items synced to markdown files successfully!");
  })
  .catch((error) => {
    console.error("Failed to sync project to markdown:", error);
    process.exit(1);
  });