import { unified } from "unified";
import parse from "remark-parse";
import gfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { selectAll } from "unist-util-select";
import { graphql } from "@octokit/graphql";
import { fetchProjectBoard } from "./project-to-stories";
import type { ProjectBoardItem } from "./project-to-stories";
import stripIndent from "strip-indent";
import { Logger, createMemoryLogger, ResultWithLogs, LogEntry } from "./types";

const md = unified().use(parse).use(gfm).use(remarkStringify, {
    bullet: "-",
    fences: true,
    incrementListMarker: true,
    listItemIndent: "one"
});

type SyncIssuesParam =
    | {
          __typename: "Issue" | "PullRequest" | "ProjectCard" | "DraftIssue";
          id: string; 
          state: "OPEN" | "CLOSED";
      }
    | { __typename: "UpdateProjectCard"; id: string; title: string; body: string; state: "OPEN" | "CLOSED"; }
    | { __typename: "NewProjectCard"; columnId: string; title: string; body: string; }
    | { __typename: "UpdateDraftIssue"; id: string; title: string; body: string; state: "OPEN" | "CLOSED"; }
    | { __typename: "NewDraftIssue"; projectId: string; title: string; body: string; }
    | { __typename: "DeleteDraftIssue"; id: string; }
    | { __typename: "UpdateProjectItemField"; projectId: string; itemId: string; fieldId: string; value: string | { singleSelectOptionId: string }; };

export type SyncTaskItem = { state: "OPEN" | "CLOSED"; title: string; url?: string };

export interface SyncToProjectOptions {
    projectId?: string; 
    owner?: string;
    repo?: string;
    projectNumber?: number;
    token: string;
    itemMapping?: (item: SyncTaskItem) => SyncTaskItem;
    includesNote?: boolean;
    logger?: Logger;
}

export const syncIssues = async (queryParams: SyncIssuesParam[], options: SyncToProjectOptions): Promise<void> => {
    const logger = options.logger || console;
    if (queryParams.length === 0) {
        logger.info("No issues to sync.");
        return;
    }
    
    if (options.projectId) {
        const draftIssuePlaceholders = new Map<number, string>();
        const queries = queryParams.map((param, index) => {
            if (param.__typename === "NewDraftIssue") {
                return `
                    newDraftIssue${index}: addProjectV2DraftIssue(input: {
                        projectId: "${param.projectId}"
                        title: ${JSON.stringify(param.title)}
                        body: ${JSON.stringify(param.body)}
                    }) {
                        projectItem {
                            id
                        }
                    }
                `;
            } else if (param.__typename === "UpdateDraftIssue") {
                return `
                    updateDraftIssue${index}: updateProjectV2DraftIssue(input: {
                        draftIssueId: "${param.id}"
                        title: ${JSON.stringify(param.title)}
                        body: ${JSON.stringify(param.body)}
                    }) {
                        draftIssue {
                            id
                        }
                    }
                `;
            } else if (param.__typename === "DeleteDraftIssue") {
                return `
                    deleteDraftIssue${index}: deleteProjectV2DraftIssue(input: {
                        draftIssueId: "${param.id}"
                    }) {
                        draftIssue {
                            id
                        }
                    }
                `;
            } else if (param.__typename === "UpdateProjectItemField") {
                let valueStr = "";
                if (typeof param.value === "string") {
                    valueStr = `text: ${JSON.stringify(param.value)}`;
                } else {
                    valueStr = `singleSelectOptionId: "${param.value.singleSelectOptionId}"`;
                }
                if (param.itemId.startsWith("DRAFT_ISSUE_PLACEHOLDER_")) {
                    const placeholderIndex = parseInt(param.itemId.replace("DRAFT_ISSUE_PLACEHOLDER_", ""), 10);
                    const actualId = draftIssuePlaceholders.get(placeholderIndex) || "PLACEHOLDER_ID";
                    if (actualId !== "PLACEHOLDER_ID") {
                        return `
                            updateProjectItemField${index}: updateProjectV2ItemFieldValue(input: {
                                projectId: "${param.projectId}"
                                itemId: "${actualId}"
                                fieldId: "${param.fieldId}"
                                value: { ${valueStr} }
                            }) {
                                projectV2Item {
                                    id
                                }
                            }
                        `;
                    }
                     else {
                        return "";
                    }
                } else {
                    return `
                        updateProjectItemField${index}: updateProjectV2ItemFieldValue(input: {
                            projectId: "${param.projectId}"
                            itemId: "${param.itemId}"
                            fieldId: "${param.fieldId}"
                            value: { ${valueStr} }
                        }) {
                            projectV2Item {
                                id
                            }
                        }
                    `;
                }
            } else if (param.__typename === "Issue") {
                if (param.state === "OPEN") {
                    return `reopenIssue${index}: reopenIssue(input: {issueId: "${param.id}" }) { issue { url } }`;
                } else if (param.state === "CLOSED") {
                    return `closeIssue${index}: closeIssue(input: {issueId: "${param.id}" }) { issue { url } }`;
                }
            } else if (param.__typename === "PullRequest") {
                if (param.state === "OPEN") {
                    return `reopenPR${index}: reopenPullRequest(input: {pullRequestId: "${param.id}" }) { issue { url } }`;
                } else if (param.state === "CLOSED") {
                    return `closePR${index}: closePullRequest(input: {pullRequestId: "${param.id}" }) { issue { url } }`;
                }
            } else if (param.__typename === "DraftIssue") {
                if (param.state === "OPEN") {
                    return `reopenDraftIssue${index}: updateProjectV2DraftIssue(input: { draftIssueId: "${param.id}", state: "OPEN" }) { draftIssue { id } }`;
                } else if (param.state === "CLOSED") {
                    return `closeDraftIssue${index}: updateProjectV2DraftIssue(input: { draftIssueId: "${param.id}", state: "CLOSED" }) { draftIssue { id } }`;
                }
            } else if (param.__typename === "NewProjectCard") {
                return `newProjectCart${index}: addProjectCard(input: { projectColumnId: "${param.columnId}", note: ${JSON.stringify(param.title + (param.body ? "\n\n" + param.body : ""))} }) { clientMutationId }`;
            } else if (param.__typename === "UpdateProjectCard") {
                return `updateProjectCard${index}: updateProjectCard(input: { projectCardId: "${param.id}", note: ${JSON.stringify(param.title + (param.body ? "\n\n" + param.body : ""))}, isArchived: ${param.state !== "OPEN"} }) { clientMutationId }`;
            } else if (param.__typename === "ProjectCard") {
                return `updateProjectCard${index}: updateProjectCard(input: { projectCardId: "${param.id}", isArchived: ${param.state !== "OPEN"} }) { clientMutationId }`;
            }
            throw new Error("Unknown state:" + JSON.stringify(param));
        }).filter(query => query !== "");

        const syncQuery = `mutation { ${queries.join("\n")} }`;
        logger.debug("Sync query:", syncQuery);
        if (queries.length > 0) {
            const result = await graphql<{[index: string]: any;}>(syncQuery, { headers: { authorization: `Bearer ${options.token}` } });
            if (Object.keys(result).length !== queries.length) {
                logger.error("Sync response mismatch:", result);
                throw new Error("Something wrong response:" + JSON.stringify(result));
            }
            for (const key in result) {
                if (key.startsWith("newDraftIssue")) {
                    const index = parseInt(key.replace("newDraftIssue", ""), 10);
                    if (result[key] && result[key].projectItem) {
                        draftIssuePlaceholders.set(index, result[key].projectItem.id);
                    }
                }
            }
            const secondRoundParams = queryParams
                .filter((param): param is SyncIssuesParam & { __typename: "UpdateProjectItemField" } => param.__typename === "UpdateProjectItemField" && param.itemId.startsWith("DRAFT_ISSUE_PLACEHOLDER_"))
                .map(param => {
                    const placeholderIndex = parseInt(param.itemId.replace("DRAFT_ISSUE_PLACEHOLDER_", ""), 10);
                    const actualId = draftIssuePlaceholders.get(placeholderIndex);
                    if (actualId && actualId !== "PLACEHOLDER_ID") {
                        return { ...param, itemId: actualId };
                    }
                    return null;
                })
                .filter((param): param is SyncIssuesParam & { __typename: "UpdateProjectItemField" } => param !== null);

            if (secondRoundParams.length > 0) {
                return syncIssues(secondRoundParams, options);
            }
            logger.info("Successfully synced items.");
        }
    } else {
        // @ts-ignore
        const queries = queryParams.map((param, index) => {
            // ... (omitted for brevity)
        });
        const syncQuery = `mutation { ${queries.join("\n")} }`;
        logger.debug("Legacy sync query:", syncQuery);
        const result = await graphql<{[index: string]: any;}>(syncQuery, { headers: { authorization: `token ${options.token}` } });
        if (Object.keys(result).length !== queryParams.length) {
            logger.error("Legacy sync response mismatch:", result);
            throw new Error("Something wrong response:" + JSON.stringify(result));
        }
        logger.info("Successfully synced items using legacy API.");
    }
};

type TodoItem =
    | {
          type: "ISSUE_PR";
          state: "OPEN" | "CLOSED";
          title: string;
          body: string;
          url: string;
          status?: string;
      }
    | {
          type: "Note";
          state: "OPEN" | "CLOSED";
          title: string;
          body: string;
          url: undefined;
          status?: string;
      };

export const createSyncRequestObject = async (markdown: string, options: SyncToProjectOptions) => {
    const logger = options.logger || console;
    const tree = md.parse(markdown);
    const headings = selectAll("root > heading", tree);
    const listItems = selectAll("root > list > listItem", tree);
    
    const normalizeStatus = (status: string): string => {
        return status.toLowerCase().replace(/\s+/g, "");
    };
    
    const todoItems: TodoItem[] = listItems.map((item: any) => {
        const todoText = md.stringify(item);
        const lines = todoText.split(/\r?\n/);
        const title = lines[0].replace(/^-\s+(?:\[[ x]\s+)?/, "");
        const body = stripIndent(lines.slice(1).join("\n"));
        const url = item.children[0]?.children[0]?.url;
        let status: string | undefined;
        const itemPosition = item.position?.start?.line || 0;
        let closestHeading: any = null;
        for (const heading of headings) {
            const headingPosition = heading.position?.start?.line || 0;
            if (headingPosition < itemPosition) {
                if (!closestHeading || headingPosition > closestHeading.position?.start?.line) {
                    closestHeading = heading;
                }
            }
        }
        if (closestHeading) {
            const headingText = md.stringify(closestHeading).trim();
            const normalizedHeading = headingText.toLowerCase();
            if (normalizedHeading.includes("to do") || normalizedHeading.includes("todo")) { status = "To Do"; }
            else if (normalizedHeading.includes("ready")) { status = "Ready"; }
            else if (normalizedHeading.includes("in progress")) { status = "In Progress"; }
            else if (normalizedHeading.includes("done")) { status = "Done"; }
            else if (normalizedHeading.includes("backlog")) { status = "Backlog"; }
            else if (normalizedHeading.includes("in review")) { status = "In review"; }
            else { status = headingText; }
        }
        return { type: url ? "ISSUE_PR" : "Note", state: item.checked ? "CLOSED" : "OPEN", title: title, body: body, url: url, status: status } as TodoItem;
    });

    if (!options.projectId) {
        throw new Error("projectId is required to fetch project board");
    }
    const project = await fetchProjectBoard({ projectId: options.projectId, token: options.token });
    const needToUpdateItems: SyncIssuesParam[] = [];
    const itemMapping = options.itemMapping ? options.itemMapping : (item: SyncTaskItem) => item;
    
    let statusField: any = null;
    if (options.projectId) {
        const query = `query($projectId: ID!) { node(id: $projectId) { ... on ProjectV2 { id, title, fields(first: 100) { nodes { ... on ProjectV2SingleSelectField { id, name, options { id, name } } } } } } }`;
        try {
            const res: any = await graphql(query, { projectId: options.projectId, headers: { authorization: `Bearer ${options.token}` } });
            statusField = res.node.fields.nodes.find((field: any) => field.name === "Status");
        } catch (error) {
            logger.warn("Could not fetch project fields:", error);
        }
    }
    
    const findProjectTodoItem = (todoItem: TodoItem): { columnId: string; item: ProjectBoardItem } | undefined => {
        for (const column of project.columns) {
            for (const columnItem of column.items) {
                const syncTaskItem = itemMapping(todoItem);
                if (!columnItem.id) {
                    logger.warn(`Skipping item with missing ID for "${columnItem.title}"`);
                    continue;
                }
                const syncTitle = syncTaskItem.title.replace(/^Story:\s*/, '').trim();
                const itemTitle = columnItem.title.replace(/^Story:\s*/, '').trim();
                if (syncTitle === itemTitle) {
                    return { item: columnItem, columnId: column.id };
                }
                if (columnItem.storyId && syncTaskItem.url && syncTaskItem.url.includes(columnItem.storyId)) {
                    return { item: columnItem, columnId: column.id };
                }
                if (syncTaskItem.url && columnItem.url && syncTaskItem.url === columnItem.url) {
                    return { item: columnItem, columnId: column.id };
                }
            }
        }
        return;
    };
    
    for (const todoItem of todoItems) {
        let projectItem = findProjectTodoItem(todoItem);
        if (projectItem) {
            logger.info(`Found existing item for "${todoItem.title}": ${projectItem.item.id}`);
        } else {
            logger.info(`No existing item found for "${todoItem.title}"`);
        }

        if (!projectItem && options.projectId) {
            logger.info(`Creating new draft issue for "${todoItem.title}"`);
            if (options.includesNote && (todoItem.state === "OPEN" || todoItem.state === "CLOSED")) {
                needToUpdateItems.push({ __typename: "NewDraftIssue", projectId: options.projectId, title: todoItem.title, body: todoItem.body });
                if (todoItem.status && statusField) {
                    const draftIssueIndex = needToUpdateItems.length - 1;
                    const statusOption = statusField.options.find((option: any) => normalizeStatus(option.name) === normalizeStatus(todoItem.status || ""));
                    if (statusOption) {
                        needToUpdateItems.push({ __typename: "UpdateProjectItemField", projectId: options.projectId, itemId: `DRAFT_ISSUE_PLACEHOLDER_${draftIssueIndex}`, fieldId: statusField.id, value: { singleSelectOptionId: statusOption.id } });
                    }
                }
            }
            continue;
        }
        
        if (!projectItem && !options.projectId) {
            if (options.includesNote && todoItem.type === "Note" && todoItem.state === "OPEN") {
                needToUpdateItems.push({ __typename: "NewProjectCard", columnId: project.columns[0].id, title: todoItem.title, body: todoItem.body });
            }
            continue;
        }
        
        if (projectItem && options.projectId) {
            if (options.includesNote && todoItem.type === "Note") {
                const isChangedContent = todoItem.body.trim() !== projectItem.item.body.trim();
                const needToUpdateState = todoItem.state !== projectItem.item.state;
                if (isChangedContent || needToUpdateState) {
                    needToUpdateItems.push({ __typename: "UpdateDraftIssue", id: projectItem.item.id, title: todoItem.title, body: todoItem.body, state: todoItem.state });
                    continue;
                }
            }
        }
        
        if (projectItem && !options.projectId) {
            if (options.includesNote && todoItem.type === "Note") {
                const isChangedContent = todoItem.body.trim() !== projectItem.item.body.trim();
                if (isChangedContent) {
                    needToUpdateItems.push({ __typename: "UpdateProjectCard", id: projectItem.item.id, title: todoItem.title, body: todoItem.body, state: todoItem.state });
                    continue;
                }
            }
        }
        
        if (projectItem) {
            const needToUpdateItem = todoItem.state !== projectItem.item.state;
            if (needToUpdateItem) {
                if (options.projectId) {
                    needToUpdateItems.push({ __typename: projectItem.item.__typename as "Issue" | "PullRequest" | "DraftIssue", id: projectItem.item.id, state: todoItem.state });
                } else {
                    needToUpdateItems.push({ __typename: projectItem.item.__typename as "Issue" | "PullRequest" | "ProjectCard", id: projectItem.item.id, state: todoItem.state });
                }
            }
            
            if (options.projectId && todoItem.status && statusField) {
                if (todoItem.status !== projectItem.item.status) {
                    const statusOption = statusField.options.find((option: any) => normalizeStatus(option.name) === normalizeStatus(todoItem.status || ""));
                    if (statusOption) {
                        logger.info(`Updating status for "${todoItem.title}" from "${projectItem.item.status}" to "${todoItem.status}"`);
                        needToUpdateItems.push({ __typename: "UpdateProjectItemField", projectId: options.projectId, itemId: projectItem.item.projectItemId || projectItem.item.id, fieldId: statusField.id, value: { singleSelectOptionId: statusOption.id } });
                    } else {
                        logger.warn(`Status option not found for "${todoItem.status}". Available options:`, statusField.options.map((opt: any) => opt.name));
                    }
                } else {
                    logger.debug(`Status unchanged for "${todoItem.title}": ${todoItem.status}`);
                }
            }
        }
    }
    
    return needToUpdateItems;
};

export const syncToProject = async (markdown: string, options: SyncToProjectOptions): Promise<ResultWithLogs<{ success: boolean; errors: LogEntry[] }>> => {
    const { logger: memoryLogger, getLogs } = createMemoryLogger();
    const logger = options.logger || console;
    const log = (level: LogEntry['level'], message: string, ...args: any[]) => {
        logger[level](message, ...args);
        memoryLogger[level](message, ...args);
    };

    try {
        const updateItems = await createSyncRequestObject(markdown, { ...options, logger });
        log('debug', "Update items:", updateItems);
        await syncIssues(updateItems, { ...options, logger });
        log('info', 'Sync to project completed successfully.');
        const logs = getLogs();
        const errors = logs.filter(l => l.level === 'error');
        return { result: { success: errors.length === 0, errors }, logs };
    } catch (error: any) {
        log('error', 'Failed to sync to project:', error);
        const logs = getLogs();
        const errors = logs.filter(l => l.level === 'error');
        return { result: { success: false, errors }, logs };
    }
};
