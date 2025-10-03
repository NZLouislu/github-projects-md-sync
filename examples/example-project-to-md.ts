#!/usr/bin/env node

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs/promises";
import { generateStoriesFromProject } from "../src/project-to-stories";

// Load environment variables
dotenv.config();

/**
 * Example usage of syncing project items to markdown files
 * This script will fetch items from a GitHub Project and generate markdown story files
 */
async function syncProjectToMarkdown(customPath?: string): Promise<void> {
  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;

  if (!projectId || !token) {
    throw new Error("Missing required environment variables: PROJECT_ID or GITHUB_TOKEN");
  }

  try {
    // Use custom path if provided, otherwise default to stories directory
    const targetPath = customPath || path.join(process.cwd(), "stories");
    
    console.log(`Syncing project items to markdown files in: ${targetPath}`);
    
    // Create directory if it doesn't exist
    try {
      await fs.access(targetPath);
    } catch {
      await fs.mkdir(targetPath, { recursive: true });
    }
    
    // Generate stories from project
    await generateStoriesFromProject({ 
      projectId, 
      token,
      storiesDirPath: targetPath  // Pass custom path to the function
    });
    
    console.log("Project items synced to markdown files successfully!");
  } catch (error) {
    console.error("Failed to sync project to markdown:", error);
    process.exit(1);
  }
}

// Run the sync if this file is executed directly
if (require.main === module) {
  // Allow passing custom directory as command line argument
  const customDir = process.argv[2];
  syncProjectToMarkdown(customDir);
}