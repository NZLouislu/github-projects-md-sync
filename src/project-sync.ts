import { generateStoriesFromProject } from "./project-to-stories";
import { syncToProject } from "./markdown-to-project";
import { parseStoryFile, createOrUpdateProjectItem } from "./story-to-project-item";
import path from "path";
import fs from "fs/promises";

export function isStoryFile(content: string): boolean {
  const trimmed = content.trim();

  const storyPattern = /^##+\s*story\s*:/i;

  if (storyPattern.test(trimmed)) {
    const lines = trimmed.split('\n').slice(0, 3);
    return lines.some(line => storyPattern.test(line.trim()));
  }

  return false;
}

export async function projectToMd(projectId: string, githubToken: string, outputPath?: string): Promise<void> {
  const defaultOutputPath = './stories';
  const finalOutputPath = outputPath || defaultOutputPath;

  try {
    await fs.access(finalOutputPath);
  } catch {
    await fs.mkdir(finalOutputPath, { recursive: true });
    console.log(`Created directory: ${finalOutputPath}`);
  }

  console.log(`Exporting stories to: ${finalOutputPath}`);

  return generateStoriesFromProject({
    projectId,
    token: githubToken,
    storiesDirPath: finalOutputPath
  });
}

export async function mdToProject(projectId: string, githubToken: string, sourcePath: string): Promise<void> {
  const files = await fs.readdir(sourcePath);
  const mdFiles = files.filter(f => f.endsWith('.md'));

  if (mdFiles.length === 0) {
    console.log('No markdown files found in the specified directory.');
    return;
  }

  const options = {
    projectId,
    token: githubToken,
    includesNote: true
  };

  let processedCount = 0;
  let storyCount = 0;
  let todoCount = 0;

  for (const file of mdFiles) {
    try {
      const fullPath = path.join(sourcePath, file);
      const content = await fs.readFile(fullPath, 'utf8');

      if (isStoryFile(content)) {
        console.log(`Processing story file: ${file}`);
        const story = await parseStoryFile(fullPath);
        await createOrUpdateProjectItem(projectId, story, githubToken);
        storyCount++;
      } else {
        console.log(`Processing todo list file: ${file}`);
        await syncToProject(content, options);
        todoCount++;
      }

      processedCount++;
    } catch (error) {
      console.error(`Failed to process file ${file}:`, error);
      // 继续处理其他文件
    }
  }

  console.log(`Sync completed: ${processedCount} files processed (${storyCount} stories, ${todoCount} todo lists)`);
}