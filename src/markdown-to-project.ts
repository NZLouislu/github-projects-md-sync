import { unified } from "unified";
import parse from "remark-parse";
import gfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { selectAll } from "unist-util-select";
import { graphql } from "@octokit/graphql";
import { fetchProjectBoard, findStoryIdInBody } from "./project-to-stories";
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
    |
    {
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
    dryRun?: boolean;
}

export const syncIssues = async (queryParams: SyncIssuesParam[], options: SyncToProjectOptions): Promise<void> => {
    const logger = options.logger || console;
    if (queryParams.length === 0) {
        logger.info("No issues to sync.");
        return;
    }

    if (options.dryRun) {
        for (const p of queryParams) {
            if (p.__typename === "NewDraftIssue") {
                logger.info(`Plan: Create DraftIssue "${p.title}". Body: ${p.body}`);
            } else if (p.__typename === "UpdateDraftIssue") {
                logger.info(`Plan: Update DraftIssue "${p.id}" state=${p.state}`);
            } else if (p.__typename === "DeleteDraftIssue") {
                logger.info(`Plan: Delete DraftIssue "${p.id}"`);
            } else if (p.__typename === "UpdateProjectItemField") {
                const v = typeof p.value === "string" ? p.value : JSON.stringify(p.value);
                logger.info(`Plan: Update Item Field itemId=${p.itemId} fieldId=${p.fieldId} value=${v}`);
            } else if (p.__typename === "Issue") {
                logger.info(`Plan: Update Issue "${p.id}" state=${p.state}`);
            } else if (p.__typename === "PullRequest") {
                logger.info(`Plan: Update PullRequest "${p.id}" state=${p.state}`);
            } else if (p.__typename === "NewProjectCard") {
                logger.info(`Plan: Create Project Card columnId=${p.columnId} title="${p.title}"`);
            } else if (p.__typename === "UpdateProjectCard") {
                logger.info(`Plan: Update Project Card "${p.id}" state=${p.state}`);
            } else if (p.__typename === "ProjectCard") {
                logger.info(`Plan: Update Project Card "${p.id}" state=${p.state}`);
            } else {
                logger.warn(`Unknown state: ${JSON.stringify(p)}`);
            }
        }
        logger.info("Dry-run: no API calls performed.");
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
            logger.warn("Unknown state:" + JSON.stringify(param));
            return "";
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
    |
    {
        type: "ISSUE_PR";
        state: "OPEN" | "CLOSED";
        title: string;
        body: string;
        url: string;
        status?: string;
        storyId?: string;
    }
    | {
        type: "Note";
        state: "OPEN" | "CLOSED";
        title: string;
        body: string;
        url: undefined;
        status?: string;
        storyId?: string;
    };

export const createSyncRequestObject = async (markdown: string, options: SyncToProjectOptions) => {
    const logger = options.logger || console;
    const tree = md.parse(markdown);
    const headings = selectAll("root > heading", tree);
    const listItems = selectAll("root > list > listItem", tree);
    
    const normalizeStatus = (status: string): string => {
        return status.toLowerCase().replace(/\s+/g, "");
    };

    const normalizeTitleLine = (rawLine: string): string => {
        const line = rawLine || "";
        const storyMatch = line.match(/^\s*[-*+]\s*(?:\[[ x]\]\s*)?Story\s*[:\-]\s*(.+)$/i);
        if (storyMatch) {
            return storyMatch[1].trim();
        }
        let sanitized = line.trim();
        sanitized = sanitized.replace(/^\s*[-*+]\s*/, "").trim();
        sanitized = sanitized.replace(/^\[[x\s]\]\s*/i, "").trim();
        if (/^Story\s*[:\-]/i.test(sanitized)) {
            sanitized = sanitized.replace(/^Story\s*[:\-]\s*/i, "").trim();
        }
        return sanitized;
    };
    
    const todoItems: TodoItem[] = listItems.map((item: any) => {
        const todoText = md.stringify(item);
        const lines = todoText.split(/\r?\n/);
        const title = normalizeTitleLine(lines[0] || "");
        const rawBody = stripIndent(lines.slice(1).join("\n"));
        const body = rawBody.replace(/(^|\n)(\s*)story\s*id\s*:/gi, (_match, prefix, indent) => `${prefix}${indent}Story ID:`);
        const storyId = findStoryIdInBody(body) || undefined;
        const url = item.children[0]?.children[0]?.url;
        const finalTitle = title || (storyId ? body.split(/\r?\n/).map(line => line.trim()).filter(Boolean)[0] || "" : "");
        if (!finalTitle) {
            logger.warn(`Story with ID ${storyId || "unknown"} has empty title, skipping.`);
            return null;
        }
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
        return { type: url ? "ISSUE_PR" : "Note", state: item.checked ? "CLOSED" : "OPEN", title: finalTitle, body: body, url: url, status: status, storyId: storyId } as TodoItem;
    }).filter(Boolean) as TodoItem[];

    if (!options.projectId) {
        throw new Error("projectId is required to fetch project board");
    }
    const project = await fetchProjectBoard({ projectId: options.projectId, token: options.token });
    const needToUpdateItems: SyncIssuesParam[] = [];
    let created = 0;
    let skipped = 0;
    let stories = 0;
    
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
        const allItems = project.columns.flatMap(c => c.items.map(item => ({ item, columnId: c.id })))

        // 1. Match by storyId (highest priority)
        if (todoItem.storyId) {
            const found = allItems.find(({ item }) => item.storyId === todoItem.storyId);
            if (found) return found;
        }

        // 2. Match by URL (fallback)
        if (todoItem.url) {
            const found = allItems.find(({ item }) => item.url === todoItem.url);
            if (found) return found;
        }

        // 3. Match by exact title if no storyId and no URL
        const title = (todoItem as any).title?.trim().toLowerCase();
        if (title) {
            const found = allItems.find(({ item }) => item.title?.trim().toLowerCase() === title);
            if (found) return found;
        }

        return undefined;
    };
    
    for (const todoItem of todoItems) {
        if (todoItem.storyId) { stories++; }
        const projectItem = findProjectTodoItem(todoItem);

        if (projectItem) {
            // If an item with the same story ID/URL exists, skip it. md-to-project is add-only.
            logger.info(`Skipping existing item found for "${todoItem.title}" (ID: ${projectItem.item.id})`);
            if (todoItem.storyId) { skipped++; }
            continue;
        }

        // If no existing item is found, create a new one.
        logger.info(`No existing item found for "${todoItem.title}", planning to create.`);
        if (options.projectId) {
            // ProjectV2: Create a new DraftIssue
            if (options.includesNote && (todoItem.state === "OPEN" || todoItem.state === "CLOSED")) {
                needToUpdateItems.push({ __typename: "NewDraftIssue", projectId: options.projectId, title: todoItem.title, body: todoItem.body });
                if (todoItem.storyId) { created++; }
                // Also set the status if available
                if (todoItem.status && statusField) {
                    const draftIssueIndex = needToUpdateItems.length - 1;
                    const statusOption = statusField.options.find((option: any) => normalizeStatus(option.name) === normalizeStatus(todoItem.status || ""));
                    if (statusOption) {
                        needToUpdateItems.push({
                            __typename: "UpdateProjectItemField",
                            projectId: options.projectId,
                            itemId: `DRAFT_ISSUE_PLACEHOLDER_${draftIssueIndex}`,
                            fieldId: statusField.id,
                            value: { singleSelectOptionId: statusOption.id }
                        });
                    }
                }
            }
        } else {
            // Legacy Projects: Create a new ProjectCard (Note)
            if (options.includesNote && todoItem.type === "Note" && todoItem.state === "OPEN") {
                needToUpdateItems.push({ __typename: "NewProjectCard", columnId: project.columns[0].id, title: todoItem.title, body: todoItem.body });
                if (todoItem.storyId) { created++; }
            }
        }
    }
    
    (createSyncRequestObject as any).lastStats = { created, skipped, stories };
    return needToUpdateItems;
};

export const syncToProject = async (markdown: string, options: SyncToProjectOptions): Promise<ResultWithLogs<{ success: boolean; created: number; skipped: number; errors: LogEntry[] }>> => {
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
        const stats = (createSyncRequestObject as any).lastStats || { created: 0, skipped: 0 };
        return { result: { success: errors.length === 0, created: stats.created, skipped: stats.skipped, errors }, logs };
    } catch (error: any) {
        log('error', 'Failed to sync to project:', error);
        const logs = getLogs();
        const errors = logs.filter(l => l.level === 'error');
        return { result: { success: false, created: 0, skipped: 0, errors }, logs };
    }
};
