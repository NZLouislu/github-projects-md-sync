import fs from "fs/promises";
import path from "path";
import { mdEscape, mdLink } from "./utils/markdown";
import { fetchProjectBoard } from "./github-service";
import type { ProjectBoardItem, ProjectBoard } from "./github-service";
import { Logger, createMemoryLogger, ResultWithLogs, LogEntry } from "./types";
export { fetchProjectBoard } from "./github-service";
export type { ProjectBoardItem, ProjectBoard, ProjectBoardColumn, FetchProjectBoardOptions } from "./github-service";

/**
 * Generate story files from GitHub Project board
 */
export async function generateStoriesFromProject(options: { 
    projectId: string; 
    token: string;
    storiesDirPath?: string;  // Add optional custom path parameter
    logger?: Logger;
}): Promise<ResultWithLogs<{ files: string[] }>> {
    const { logger: memoryLogger, getLogs } = createMemoryLogger();
    const logger = options.logger || console;
    const log = (level: LogEntry['level'], message: string, ...args: any[]) => {
        logger[level](message, ...args);
        memoryLogger[level](message, ...args);
    };

    const createdFiles: string[] = [];

    try {
        // Fetch project board data
        const projectBoard = await fetchProjectBoard(options);
        
        const storiesDir = options.storiesDirPath || path.join(process.cwd(), "stories");
        
        try {
            await fs.access(storiesDir);
        } catch {
            await fs.mkdir(storiesDir, { recursive: true });
        }
        
        log('info', `Processing ${projectBoard.columns.flatMap(c => c.items).length} items from project board.`);

        for (const column of projectBoard.columns) {
            for (const item of column.items) {
                if (!item.title || item.title.trim() === "") {
                    log('debug', 'Skipping item with no title.');
                    continue;
                }
                
                const fileName = `${generateFileName(item.title)}.md`;
                const filePath = path.join(storiesDir, fileName);
                createdFiles.push(filePath);
                
                const storyContent = createStoryContent(item, column.name);
                
                try {
                    let existingContent: string | null = null;
                    try {
                        existingContent = await fs.readFile(filePath, 'utf8');
                    } catch (err) {
                        // File doesn't exist, which is fine
                    }
                    
                    if (existingContent) {
                        const existingStatusMatch = existingContent.match(/### Status\s*\n\s*([^\n]+)/i);
                        const existingStatus = existingStatusMatch ? existingStatusMatch[1].trim() : null;
                        
                        const descriptionRegex = /### Description\s*\n\s*([\s\S]*?)(?=\n###|$)/i;
                        const existingDescriptionMatch = existingContent.match(descriptionRegex);
                        const existingDescription = existingDescriptionMatch ? existingDescriptionMatch[1].trim() : null;
                        
                        const newStatus = item.status || column.name;
                        const newDescription = item.body || "No description provided.";
                        
                        if (existingStatus !== newStatus || existingDescription !== newDescription) {
                            const updatedContent = updateStoryContent(existingContent, newStatus, newDescription);
                            await fs.writeFile(filePath, updatedContent, "utf8");
                            log('info', `Updated story file: ${filePath}`);
                        } else {
                            log('debug', `File already exists with same content, skipping: ${fileName}`);
                        }
                    } else {
                        await fs.writeFile(filePath, storyContent, "utf8");
                        log('info', `Created story file: ${filePath}`);
                    }
                } catch (error: any) {
                    log('error', `Failed to write story file ${fileName}:`, error);
                }
            }
        }
        
        log('info', "Story generation completed!");
        return { result: { files: createdFiles }, logs: getLogs() };
    } catch (error: any) {
        log('error', "Failed to generate stories from project:", error);
        throw { error, logs: getLogs() };
    }
}

/**
 * Update the content in an existing story file
 */
export function updateStoryContent(content: string, newStatus: string, newDescription: string): string {
    let updatedContent = content;

    // Update status
    updatedContent = updatedContent.replace(/(### Status\s*\n\s*)([^\n]+)/i, `$1${newStatus}`);

    // To prevent duplicate headers, remove any "### Description" from the incoming description body.
    const cleanedDescription = newDescription.replace(/^### Description\s*\n/im, '');

    const descriptionHeader = "### Description";
    const descriptionRegex = /(### Description\s*\n\s*)([\s\S]*?)(\n###|$)/i;

    if (updatedContent.match(descriptionRegex)) {
        // If description section exists, replace its content
        updatedContent = updatedContent.replace(descriptionRegex, `$1${cleanedDescription}$3`);
    } else {
        // If no description section, add one after the status
        const statusRegex = /(### Status\s*\n\s*[^\n]+\s*\n)/i;
        updatedContent = updatedContent.replace(statusRegex, `$1\n${descriptionHeader}\n\n${cleanedDescription}\n\n`);
    }

    return updatedContent;
}

/**
 * Create story content in standard format
 */
export function createStoryContent(item: any, status: string): string {
    let content = `## Story: ${item.title}\n\n`;

    if (item.storyId) {
        content += `### Story ID\n\n${item.storyId}\n\n`;
    }

    const actualStatus = item.status || status;
    content += `### Status\n\n${actualStatus}\n\n`;

    const bodyText = item.body && item.body.trim().length > 0 ? item.body : "No description provided.";
    content += `### Description\n\n${bodyText}\n\n`;

    return content;
}

/**
 * Generate a safe filename from a title
 */
export function generateFileName(title: string): string {
    return title
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "-")  // Replace non-alphanumeric chars with -
        .replace(/-+/g, "-")                         // Replace multiple - with single -
        .replace(/^-|-$/g, "")                       // Remove leading/trailing -
        .toLowerCase() || "untitled-story";          // Fallback name
}

export type toMarkdownOptions = {
    /**
     * If you want to treat https://example.com/a as https://example.com/b
     * itemMapping: (item) => { ...item, url: item.url.replace("/a", "/b") }
     * @param url
     */
    itemMapping?: (item: ProjectBoardItem) => ProjectBoardItem;
};

export const toMarkdown = (projectBoard: ProjectBoard, options?: toMarkdownOptions): string => {
    const check = (item: ProjectBoardItem) => {
        return item.state === "OPEN" ? `[ ]` : "[x]";
    };
    const itemMapping = options?.itemMapping ? options.itemMapping : (item: ProjectBoardItem) => item;
    return (
        `# ${projectBoard.name}\n\n` +
        projectBoard.columns
            .map((column) => {
                const columnBody =
                    `## ${mdEscape(column.name)}\n\n` +
                    column.items
                        .map((item) => {
                            const mappedItem = itemMapping(item);
                            // Create markdown with additional fields for V2
                            let markdown = `- ${check(mappedItem)} ${mdLink({
                                text: mappedItem.title,
                                url: mappedItem.url
                            })}`;
                            
                            // Add additional fields if they exist
                            if (mappedItem.storyId) {
                                markdown += `\n  - Story ID: ${mappedItem.storyId}`;
                            }
                            
                            if (mappedItem.status) {
                                markdown += `\n  - Status: ${mappedItem.status}`;
                            }
                            
                            if (mappedItem.body) {
                                const body = mappedItem.body
                                    .split(/\r?\n/)
                                    .map((line) => "    " + line)
                                    .join("\n");
                                markdown += `\n${body}`;
                            }
                            
                            return markdown;
                        })
                        .join("\n");
                return columnBody + "\n";
            })
            .join("\n")
            .trim() + "\n"
    );
};

// Run the script if executed directly
if (require.main === module) {
    const projectId = process.env.PROJECT_ID;
    const token = process.env.GITHUB_TOKEN;
    
    if (!projectId || !token) {
        console.error("Missing required environment variables: PROJECT_ID or GITHUB_TOKEN");
        process.exit(1);
    }
    
    const storiesDir = process.argv[2];
    
    generateStoriesFromProject({
        projectId,
        token,
        storiesDirPath: storiesDir
    })
        .catch(error => {
            console.error("Script failed:", error);
            process.exit(1);
        });
}
