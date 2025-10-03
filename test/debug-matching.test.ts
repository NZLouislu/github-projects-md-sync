import {
  fetchProjectBoard
} from "../src/project-to-stories";
import dotenv from "dotenv";

// Load .env file
dotenv.config();

const TOKEN = process.env.GITHUB_TOKEN as string;
const PROJECT_ID = process.env.PROJECT_ID as string;

describe("debug matching", function () {
  // Increase timeout for tests
  this.timeout(15000);
  
  // Skip all tests in CI environment or when no token is provided
  before(function() {
    if (!TOKEN || !PROJECT_ID || process.env.CI) {
      this.skip();
    }
  });

  it("should show project items", async function () {
    const project = await fetchProjectBoard({
      projectId: PROJECT_ID,
      token: TOKEN
    });
    
    console.log("Project columns and items:");
    project.columns.forEach(column => {
      console.log(`Column: ${column.name} (${column.items.length} items)`);
      column.items.forEach(item => {
        console.log(`  - ${item.title} (ID: ${item.id}, URL: ${item.url})`);
      });
    });
  });
});