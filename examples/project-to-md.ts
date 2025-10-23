import * as dotenv from "dotenv";
import * as path from "path";
import { projectToMdWithOptions, projectToMdSingleStory } from "../src/index";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function run() {
  console.log("=== Sync GitHub Project to Markdown Files (v0.1.11) ===");
  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;
  if (!projectId || !token) {
    console.log("Missing PROJECT_ID or GITHUB_TOKEN");
    process.exit(0);
  }

  const args = process.argv.slice(2);
  const positionalArgs: string[] = [];
  let storyId: string | undefined;
  let storyFlagEncountered = false;
  let outputFromFlag: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--story") {
      storyFlagEncountered = true;
      storyId = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--story=")) {
      storyId = arg.substring("--story=".length);
      storyFlagEncountered = true;
      continue;
    }
    if (arg === "--output") {
      outputFromFlag = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--output=")) {
      outputFromFlag = arg.substring("--output=".length);
      continue;
    }
    positionalArgs.push(arg);
  }

  if (storyFlagEncountered && (!storyId || storyId.startsWith("--"))) {
    console.error("Missing story ID value for --story option");
    process.exit(1);
  }

  if (!storyId && positionalArgs.length > 0) {
    const storyIndex = positionalArgs.findIndex(value => value.toLowerCase().startsWith("story-"));
    if (storyIndex !== -1) {
      storyId = positionalArgs[storyIndex];
      positionalArgs.splice(storyIndex, 1);
    }
  }

  const outputFromArgs = positionalArgs.length > 0 ? positionalArgs.shift() : undefined;
  const selectedOutput = outputFromFlag ?? outputFromArgs;
  const customDir = selectedOutput ? path.resolve(selectedOutput) : path.join(__dirname, "items");

  const { result, logs } = storyId
    ? await projectToMdSingleStory(projectId, token, storyId, customDir)
    : await projectToMdWithOptions({ projectId, githubToken: token, outputPath: customDir });

  console.log("\n--- Logs ---");
  logs.forEach(log => {
    console.log(`[${log.level.toUpperCase()}] ${log.message}`, ...(log.args ?? []));
  });
  console.log("------------\n");

  if (result.success) {
    console.log(`Project items exported successfully to ${result.outputDir}!`);
    console.log(`Created/updated ${result.files.length} files.`);
  } else {
    console.error("Failed to export project items to markdown.");
    if (result.errors.length > 0) {
      console.error("\n--- Errors ---");
      result.errors.forEach(error => {
        console.error(`[${error.level.toUpperCase()}] ${error.message}`, ...(error.args ?? []));
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