import { graphql } from "@octokit/graphql";
import createDebug from "debug";
import { findStoryIdInBody } from "./project-to-stories"; // Import the helper
const debug = createDebug("github-projects-md-sync");

// Re-exporting ProjectBoardItem and related types for other modules to use from a single source
export interface ProjectBoardItem {
    __typename?: "Issue" | "PullRequest" | "DraftIssue" | "ProjectCard";
    id: string; // GitHub Node id of the content (Issue, PR, DraftIssue)
    projectItemId?: string; // GitHub Node id of the ProjectV2Item (optional for tests/utilities)
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
    projectId: string; // Project V2 ID is mandatory
    token: string;
}

/**
 * Fetches project board data from GitHub API.
 * This is the central function to get the current state of the project board.
 * @param options
 */
export async function fetchProjectBoard(options: FetchProjectBoardOptions): Promise<ProjectBoard> {
    if (!options.projectId || !options.token) {
        throw new Error("projectId and token are required for fetching project data.");
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

    debug("Fetching project board for projectId %s", options.projectId);
    
    const res: any = await graphql(query, {
        projectId: options.projectId,
        headers: {
            authorization: `Bearer ${options.token}`
        }
    });

    const project = res.node;
    if (!project) {
        throw new Error(`Project with ID "${options.projectId}" not found.`);
    }

    const statusField = project.fields.nodes.find((field: any) => field.name === "Status");
    
    const statusGroups: Record<string, ProjectBoardItem[]> = {};
    
    for (const item of project.items.nodes) {
        let status = "Backlog";
        let storyIdFromField = "";
        
        for (const fieldValue of item.fieldValues.nodes) {
            if (fieldValue.field?.name === "Status") {
                status = (fieldValue as any).name || status;
            } else if (fieldValue.field?.name === "Story ID") {
                storyIdFromField = fieldValue.text || storyIdFromField;
            }
        }
        
        const content = item.content;
        if (!content) continue;
        
        const body = content.body || "";
        const storyIdFromBody = findStoryIdInBody(body);

        const projectItem: ProjectBoardItem = {
            __typename: content.__typename,
            id: content.id,
            projectItemId: item.id,
            title: content.title,
            url: content.url || "",
            body: body,
            state: content.state === "CLOSED" || content.state === "MERGED" ? "CLOSED" : "OPEN",
            storyId: storyIdFromField || storyIdFromBody || undefined,
            status: status || "Backlog"
        };
        
        if (!statusGroups[status]) {
            statusGroups[status] = [];
        }
        statusGroups[status].push(projectItem);
    }
    
    let columns: ProjectBoardColumn[];
    if (statusField && statusField.options) {
        columns = statusField.options.map((option: any) => ({
            id: option.id,
            name: option.name,
            items: statusGroups[option.name] || []
        }));
    } else {
        columns = Object.keys(statusGroups).map(status => ({
            id: `status-${status}`,
            name: status,
            items: statusGroups[status]
        }));
    }

    return {
        id: project.id,
        name: project.title,
        columns
    };
}