import { generateStoriesFromProject } from "./project-to-stories";
import { syncToProject } from "./markdown-to-project";
/* removed unused imports */
import path from "path";
import fs from "fs/promises";
import { Logger, createMemoryLogger, ResultWithLogs, LogEntry, ProjectToMdResult, MdToProjectResult } from "./types";

export function isStoryFile(content: string): boolean {
  const trimmed = content.trim();
  const storyPattern = /^##+\s*story\s*:/i;
  if (storyPattern.test(trimmed)) {
    const lines = trimmed.split('\n').slice(0, 3);
    return lines.some(line => storyPattern.test(line.trim()));
  }
  return false;
}

export async function projectToMd(
  projectId: string,
  githubToken: string,
  outputPath?: string,
  logger: Logger = console,
  logLevel: LogEntry['level'] = 'debug'
): Promise<ResultWithLogs<ProjectToMdResult>> {
  return projectToMdWithOptions({ projectId, githubToken, outputPath, logger, logLevel });
}

export async function projectToMdWithOptions(options: {
  projectId: string;
  githubToken: string;
  outputPath?: string;
  storyId?: string;
  logger?: Logger;
  logLevel?: LogEntry['level'];
}): Promise<ResultWithLogs<ProjectToMdResult>> {
  const {
    projectId,
    githubToken,
    outputPath,
    storyId,
    logger = console,
    logLevel = 'debug'
  } = options;
  const { logger: memoryLogger, getLogs } = createMemoryLogger();
  const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error'];
  const minLevelIndex = levels.indexOf(logLevel);
  const log = (level: LogEntry['level'], message: string, ...args: any[]) => {
    if (levels.indexOf(level) >= minLevelIndex) {
      logger[level](message, ...args);
    }
    memoryLogger[level](message, ...args);
  };

  const defaultOutputPath = './stories';
  const finalOutputPath = outputPath || defaultOutputPath;
  const createdFiles: string[] = [];

  try {
    await fs.access(finalOutputPath);
  } catch {
    await fs.mkdir(finalOutputPath, { recursive: true });
    log('info', `Created directory: ${finalOutputPath}`);
  }

  log('info', `Exporting stories to: ${finalOutputPath}`);

  try {
    const result = await generateStoriesFromProject({
      projectId,
      token: githubToken,
      storiesDirPath: finalOutputPath,
      logger,
      storyId
    });
    createdFiles.push(...result.result.files);
    result.logs.forEach(entry => log(entry.level, entry.message, ...entry.args));
    if (storyId && createdFiles.length === 0) {
      log('warn', `Story with ID "${storyId}" was not found in project.`);
    } else if (storyId && createdFiles.length > 0) {
      log('info', `Exported story with ID "${storyId}".`);
    }
    log('info', 'Project to markdown conversion completed successfully.');
    const logs = getLogs();
    const errors = logs.filter(l => l.level === 'error');
    return { result: { success: errors.length === 0, outputDir: finalOutputPath, files: createdFiles, errors }, logs };
  } catch (error: any) {
    log('error', 'Failed to generate stories from project:', error);
    const logs = getLogs();
    const errors = logs.filter(l => l.level === 'error');
    return { result: { success: false, outputDir: finalOutputPath, files: [], errors }, logs };
  }
}

export async function projectToMdSingleStory(
  projectId: string,
  githubToken: string,
  storyId: string,
  outputPath?: string,
  logger: Logger = console,
  logLevel: LogEntry['level'] = 'debug'
): Promise<ResultWithLogs<ProjectToMdResult>> {
  return projectToMdWithOptions({ projectId, githubToken, storyId, outputPath, logger, logLevel });
}

export async function mdToProject(
  projectId: string,
  githubToken: string,
  sourcePath: string,
  logger: Logger = console,
  logLevel: LogEntry['level'] = 'debug'
): Promise<ResultWithLogs<MdToProjectResult>> {
  const { logger: memoryLogger, getLogs } = createMemoryLogger();
  const levels: LogEntry['level'][] = ['debug', 'info', 'warn', 'error'];
  const minLevelIndex = levels.indexOf(logLevel);
  const log = (level: LogEntry['level'], message: string, ...args: any[]) => {
    if (levels.indexOf(level) >= minLevelIndex) {
      logger[level](message, ...args);
    }
    memoryLogger[level](message, ...args);
  };

  let processedCount = 0;
  let createdTotal = 0;
  let skippedTotal = 0;

  try {
    const files = await fs.readdir(sourcePath);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    if (mdFiles.length === 0) {
      log('warn', 'No markdown files found in the specified directory.');
      return { result: { success: true, processedFiles: 0, created: 0, skipped: 0, errors: [] }, logs: getLogs() };
    }

    log('info', `Found ${mdFiles.length} markdown files to process.`);

    for (const file of mdFiles) {
      const fullPath = path.join(sourcePath, file);
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        log('info', `Processing multi-story markdown file: ${file}`);
        const options = {
          projectId,
          token: githubToken,
          includesNote: true,
          logger
        };
        const syncResult = await syncToProject(content, options);
        syncResult.logs.forEach(entry => log(entry.level, entry.message, ...entry.args));
        if (!syncResult.result.success) {
          log('error', `Failed to sync markdown file: ${file}`);
        }
        createdTotal += (syncResult.result.created || 0);
        skippedTotal += (syncResult.result.skipped || 0);
        processedCount++;
        log('info', `Successfully processed file: ${file}`);
      } catch (error: any) {
        log('error', `Failed to process file ${file}:`, error);
      }
    }

    log('info', `Sync completed: ${processedCount} markdown files processed (Created: ${createdTotal} stories, Skipped: ${skippedTotal} duplicates)`);
    const logs = getLogs();
    const errors = logs.filter(l => l.level === 'error');
    return { result: { success: errors.length === 0, processedFiles: processedCount, created: createdTotal, skipped: skippedTotal, errors }, logs };
  } catch (error: any) {
    log('error', `An error occurred while reading the source directory: ${sourcePath}`, error);
    const logs = getLogs();
    const errors = logs.filter(l => l.level === 'error');
    return { result: { success: false, processedFiles: 0, created: 0, skipped: 0, errors }, logs };
  }
}