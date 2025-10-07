import { graphql } from "@octokit/graphql";
import { debug } from "@deps/debug";
import fs from "fs/promises";
import path from "path";
import { mdEscape, mdLink } from "markdown-function";

export interface ProjectBoardItem {
    __typename?: "Issue" | "PullRequest" | "DraftIssue" | "ProjectCard";
    id: string; // GitHub Node id
    projectItemId: string; // Add this line
    title: string;
    url: string;
    body: string;
    state: "OPEN" | "CLOSED";
    storyId?: string;
    status?: string;
}

export interface ProjectBoardColumn {
    id: string;
    name: string;
    items: ProjectBoardItem[];
}

export interface ProjectBoard {
    id: string;
    name: string;
    columns: ProjectBoardColumn[];
}

export interface FetchProjectBoardOptions {
    projectId?: string; // Project V2 ID
    token: string;
    owner?: string;
    repo?: string;
    projectNumber?: number;
}

/**
 * Fetch project board data from GitHub
 */
export async function fetchProjectBoard(options: FetchProjectBoardOptions): Promise<ProjectBoard> {
    // For backward compatibility with the old API
    if (options.owner && options.repo && options.projectNumber) {
        // We need to convert the old parameters to projectId
        // This would require a separate query to get the project ID
        throw new Error("Legacy GitHub Projects API is not supported. Please provide projectId directly.");
    }

    if (!options.projectId) {
        throw new Error("projectId is required for GitHub Projects V2 API");
    }

    const query = `
        query($projectId: ID!) {
            node(id: $projectId) {
                ... on ProjectV2 {
                    id
                    title
                    fields(first: 100) {
                        nodes {
                            ... on ProjectV2Field {
                                id
                                name
                            }
                            ... on ProjectV2SingleSelectField {
                                id
                                name
                                options {
                                    id
                                    name
                                }
                            }
                        }
                    }
                    items(first: 100) {
                        nodes {
                            id
                            fieldValues(first: 100) {
                                nodes {
                                    ... on ProjectV2ItemFieldTextValue {
                                        text
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                    ... on ProjectV2ItemFieldSingleSelectValue {
                                        name
                                        field {
                                            ... on ProjectV2FieldCommon {
                                                name
                                            }
                                        }
                                    }
                                }
                            }
                            content {
                                ... on DraftIssue {
                                    id
                                    title
                                    body
                                    createdAt
                                }
                                ... on Issue {
                                    id
                                    title
                                    body
                                    state
                                    url
                                }
                                ... on PullRequest {
                                    id
                                    title
                                    body
                                    state
                                    url
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    debug("options", options);
    
    const res: any = await graphql(query, {
        projectId: options.projectId,
        headers: {
            authorization: `Bearer ${options.token}`
        }
    });

    const project = res.node;
    if (!project) {
        throw new Error("Not found project");
    }

    // Extract fields
    const statusField = project.fields.nodes.find((field: any) => field.name === "Status");
    
    // Group items by status
    const statusGroups: Record<string, ProjectBoardItem[]> = {};
    
    for (const item of project.items.nodes) {
        // Extract field values
        let status = "Backlog"; // Default status changed from "No status" to "Backlog"
        let storyId = "";
        
        for (const fieldValue of item.fieldValues.nodes) {
            if (fieldValue.field) {
                if (fieldValue.field.name === "Status") {
                    // For single select values, the value is in the 'name' property
                    status = (fieldValue as any).name || status;
                } else if (fieldValue.field.name === "Story ID") {
                    storyId = fieldValue.text || storyId;
                }
            }
        }
        
        // Get content details
        const content = item.content;
        if (!content) continue;
        
        const projectItem: ProjectBoardItem = {
            __typename: content.__typename,
            id: content.id,
            projectItemId: item.id, // Add this line
            title: content.title,
            url: content.url || "",
            body: content.body || "",
            state: content.state === "CLOSED" || content.state === "MERGED" ? "CLOSED" : "OPEN",
            storyId: storyId || undefined,
            status: status || "Backlog" // Ensure even if status is empty, use default value
        };
        
        // Group by status
        if (!statusGroups[status]) {
            statusGroups[status] = [];
        }
        statusGroups[status].push(projectItem);
    }
    
    // Create columns based on status field options or actual statuses found
    let columns: ProjectBoardColumn[];
    if (statusField && statusField.options) {
        columns = statusField.options.map((option: any) => ({
            id: option.id,
            name: option.name,
            items: statusGroups[option.name] || []
        }));
        
        // Ensure all status options are included in columns, even if no corresponding items
        for (const option of statusField.options) {
            if (!statusGroups[option.name]) {
                statusGroups[option.name] = [];
            }
        }
    } else {
        // Fallback to creating columns from statuses found
        columns = Object.keys(statusGroups).map(status => ({
            id: `status-${status}`,
            name: status,
            items: statusGroups[status]
        }));
    }
    
    // No longer add "No status" column, as default status is already "Backlog"

    return {
        id: project.id,
        name: project.title,
        columns
    };
}

/**
 * Generate story files from GitHub Project board
 */
export async function generateStoriesFromProject(options: { 
    projectId: string; 
    token: string;
    storiesDirPath?: string;  // Add optional custom path parameter
}): Promise<void> {
    try {
        // Fetch project board data
        const projectBoard = await fetchProjectBoard(options);
        
        // Use custom stories directory if provided, otherwise default to "stories" 
        // directory relative to current working directory
        const storiesDir = options.storiesDirPath || path.join(process.cwd(), "stories");
        
        // Create stories directory if it doesn't exist
        try {
            await fs.access(storiesDir);
        } catch {
            await fs.mkdir(storiesDir, { recursive: true });
        }
        
        // Process each column and item
        for (const column of projectBoard.columns) {
            for (const item of column.items) {
                // Skip items without meaningful content
                if (!item.title || item.title.trim() === "") continue;
                
                // Generate a filename based on the title
                const fileName = `${generateFileName(item.title)}.md`;
                const filePath = path.join(storiesDir, fileName);
                
                // Create story content in the standard format
                const storyContent = createStoryContent(item, column.name);
                
                try {
                    // Check if file already exists and read its content
                    let existingContent = null;
                    try {
                        existingContent = await fs.readFile(filePath, 'utf8');
                    } catch (err) {
                        // File doesn't exist, which is fine
                    }
                    
                    // If file exists, check if content has changed (status or description)
                    if (existingContent) {
                        // Extract status from existing file
                        const existingStatusMatch = existingContent.match(/### Status\s*\n\s*([^\n]+)/i);
                        const existingStatus = existingStatusMatch ? existingStatusMatch[1].trim() : null;
                        
                        // Extract description from existing file
                        const descriptionRegex = /### Description\s*\n\s*([\s\S]*?)(?=\n###|$)/i;
                        const existingDescriptionMatch = existingContent.match(descriptionRegex);
                        const existingDescription = existingDescriptionMatch ? existingDescriptionMatch[1].trim() : null;
                        
                        // Get the new status and description
                        const newStatus = item.status || column.name;
                        const newDescription = item.body || "No description provided.";
                        
                        // If status or description has changed, update the file with new content
                        if (existingStatus !== newStatus || existingDescription !== newDescription) {
                            // Update the content with new status and description
                            const updatedContent = updateStoryContent(existingContent, newStatus, newDescription);
                            await fs.writeFile(filePath, updatedContent, "utf8");
                            console.log(`Updated content in story file: ${filePath}`);
                        } else {
                            console.log(`File already exists with same content, skipping: ${fileName}`);
                        }
                    } else {
                        // File doesn't exist, create it
                        await fs.writeFile(filePath, storyContent, "utf8");
                        console.log(`Created story file: ${filePath}`);
                    }
                } catch (error) {
                    console.error(`Failed to write story file ${fileName}:`, error);
                }
            }
        }
        
        console.log("Story generation completed!");
    } catch (error) {
        console.error("Failed to generate stories from project:", error);
        throw error;
    }
}

/**
 * Update the content in an existing story file
 */
export function updateStoryContent(content: string, newStatus: string, newDescription: string): string {
    let updatedContent = content;
    
    // Update status
    updatedContent = updatedContent.replace(/(### Status\s*\n\s*)([^\n]+)/i, `$1${newStatus}`);
    
    // Update description - handle multiline descriptions
    const descriptionRegex = /(### Description\s*\n\s*)([\s\S]*?)(\n###|$)/i;
    const descriptionMatch = updatedContent.match(descriptionRegex);
    
    if (descriptionMatch) {
        // Replace the description section with new description
        updatedContent = updatedContent.replace(
            descriptionRegex, 
            `$1${newDescription}$3`
        );
    }
    
    return updatedContent;
}

/**
 * Create story content in standard format
 */
export function createStoryContent(item: any, status: string): string {
    let content = `## Story: ${item.title}\n\n`;
    
    // Add Story ID if available
    if (item.storyId) {
        content += `### Story ID

${item.storyId}

`;
    }
    
    // Add Status - Use item status if available, otherwise use column name
    const actualStatus = item.status || status;
    content += `### Status

${actualStatus}

`;
    
    // Add Description
    if (item.body) {
        content += `### Description

${item.body}

`;
    } else {
        content += `### Description

No description provided.

`;
    }
    
    // Only add standard sections if they're not already in the body
    // Fix: Only add Acceptance Criteria if body doesn't contain it
    
    // Fix: Only add Technical Implementation if body doesn't contain it
    
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
    
    // Allow passing custom directory as command line argument
    const storiesDir = process.argv[2];
    
    generateStoriesFromProject({ 
        projectId, 
        token,
        storiesDirPath: storiesDir  // Pass custom path if provided
    })
        .catch(error => {
            console.error("Script failed:", error);
            process.exit(1);
        });
}
