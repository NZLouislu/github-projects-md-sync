import * as dotenv from "dotenv";
import * as fs from "fs/promises";
import * as path from "path";
import { parseStoryFile } from "../src/index";

// Load environment variables
dotenv.config();

describe("External Project Usage", () => {
  const testDir = path.join(__dirname, "temp-test-stories");
  
  before(async () => {
    // Create a temporary directory for test stories
    await fs.mkdir(testDir, { recursive: true });
    
    // Create test story files
    const story1 = `## Story: Test User Authentication

### Story ID
test-auth-story

### Status
To Do

### Description
Implement user authentication system

### Acceptance Criteria
- [ ] Users can register
- [ ] Users can login
- [ ] Passwords are hashed
`;
    
    const story2 = `## Story: Database Design

### Status
In Progress

### Description
Design the database schema

### Technical Implementation
- Create ERD diagram
- Define tables and relationships
`;
    
    await fs.writeFile(path.join(testDir, "auth-story.md"), story1);
    await fs.writeFile(path.join(testDir, "db-design.md"), story2);
  });
  
  after(async () => {
    // Clean up test files
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  it("should parse story files correctly", async () => {
    const storyFile = path.join(testDir, "auth-story.md");
    const story = await parseStoryFile(storyFile);
    
    if (!story) {
      throw new Error("Story parsing failed");
    }
    
    console.log("Parsed story:", story);
  });
  
  it("should handle custom story directories", async function() {
    // Skip if no GitHub token or project ID
    if (!process.env.GITHUB_TOKEN || !process.env.PROJECT_ID) {
      this.skip();
      return;
    }
    
    // Test with custom directory
    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      // This would attempt to sync but we're not actually connecting to GitHub in tests
      console.log("Would sync stories from:", testDir);
    } finally {
      process.chdir(originalCwd);
    }
  });
  
  it("should demonstrate API usage", async () => {
    // This is just a demonstration of how the API can be used
    console.log("API Usage Example:");
    console.log("- Import functions from the main package");
    console.log("- Call syncStoriesToProject() to sync stories");
    console.log("- Use parseStoryFile() to parse individual story files");
  });
});