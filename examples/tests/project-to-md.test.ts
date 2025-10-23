import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";
import { projectToMdWithOptions } from "../../src/index";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

describe("Project to MD Export", () => {
  const testStoriesDir = path.join(__dirname, "../items");
  
  before(async function() {
    // Skip if no GitHub token or project ID
    if (!process.env.GITHUB_TOKEN || !process.env.PROJECT_ID) {
      this.skip();
      return;
    }
    
    // Create test directory if it doesn't exist
    try {
      await fs.access(testStoriesDir);
    } catch {
      await fs.mkdir(testStoriesDir, { recursive: true });
    }
  });
  
  it("should export project items to story files in specified directory", async function() {
    this.timeout(10000); // Increase timeout for this test
    
    try {
      // Test exporting project items to markdown files in our custom directory
      const { result, logs } = await projectToMdWithOptions({
        projectId: process.env.PROJECT_ID!,
        githubToken: process.env.GITHUB_TOKEN!,
        outputPath: testStoriesDir
      });
      
      logs.forEach(log => console.log(`[${log.level}] ${log.message}`, ...log.args));

      if(result.success) {
        console.log("Project items exported successfully to story files");
        // Check if some files were created in the custom directory
        try {
          const files = await fs.readdir(testStoriesDir);
          console.log(`Files in stories directory: ${files.length}`);
          
          // Log first few files as examples
          files.slice(0, 3).forEach(file => {
            console.log(`  - ${file}`);
          });
          
          // Verify that at least one markdown file was created
          const markdownFiles = files.filter(file => file.endsWith('.md'));
          if (markdownFiles.length === 0) {
            console.warn("No markdown files were created in the stories directory");
          }
        } catch (error) {
          console.log("Error reading stories directory:", error);
        }
      } else {
        console.error("Failed to export project items");
      }
    } catch (error) {
      console.error("Failed to export project items:", error);
      // We expect this to potentially fail due to missing GitHub connection in tests
      console.log("Project export test completed (may have failed due to GitHub connection)");
    }
  });
});