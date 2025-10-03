import fs from "fs/promises";
import path from "path";
import { graphql } from "@octokit/graphql";
import { extractStoryId } from "./utils/story-id";

interface Story {
  title: string;
  status: string;
  content: string;
  fileName: string;
  storyId: string;
}

/**
 * Parse a story markdown file
 * @param filePath Path to the markdown file
 * @returns Parsed story object
 */
export async function parseStoryFile(filePath: string): Promise<Story> {
  const content = await fs.readFile(filePath, "utf8");
  const lines = content.split("\n");
  
  let title = "";
  let status = "Backlog"; // Default status
  let storyId = "";
  let currentSection = "";
  const sections: Record<string, string[]> = {};
  
  for (const line of lines) {
    // Extract title
    if (line.startsWith("## Story: ")) {
      title = line.replace("## Story: ", "").trim();
      continue;
    }
    
    // Extract story ID
    if (line.startsWith("### Story ID")) {
      currentSection = "Story ID";
      sections[currentSection] = [];
      continue;
    }
    
    // Extract status
    if (line.startsWith("### Status")) {
      currentSection = "Status";
      sections[currentSection] = [];
      continue;
    }
    
    // Extract other sections
    if (line.startsWith("### ")) {
      currentSection = line.replace("### ", "").trim();
      sections[currentSection] = [];
      continue;
    }
    
    // Add content to current section
    if (currentSection) {
      if (currentSection === "Status") {
        // Only update status if line is not empty and not another section header
        if (line.trim() !== "" && !line.startsWith("##") && !line.startsWith("###")) {
          status = line.trim();
        }
      } else if (currentSection === "Story ID") {
        if (line.trim() !== "" && !line.startsWith("##") && !line.startsWith("###")) {
          storyId = line.trim();
        }
      } else {
        if (!line.startsWith("##") && !line.startsWith("###")) {
          sections[currentSection].push(line);
        }
      }
    }
  }
  
  // Create a frontmatter object to pass to extractStoryId
  const frontmatter: Record<string, any> = {};
  if (storyId) {
    frontmatter["storyId"] = storyId;
  }
  
  // Use the new extractStoryId function
  storyId = extractStoryId(frontmatter, filePath);
  
  // Clean up section content
  const cleanSections: Record<string, string> = {};
  for (const [key, value] of Object.entries(sections)) {
    cleanSections[key] = value.join("\n").trim();
  }
  
  // Build the content for the project card
  let cardContent = `## ${title}\n\n`;
  for (const [section, content] of Object.entries(cleanSections)) {
    if (section !== "Status" && section !== "Story ID") {
      cardContent += `### ${section}\n${content}\n\n`;
    }
  }
  
  return {
    title,
    status,
    content: cardContent,
    fileName: path.basename(filePath),
    storyId
  };
}

/**
 * Find an existing project item by Story ID
 */
async function findExistingItem(projectId: string, storyId: string, token: string): Promise<string | null> {
  const query = `
    query($projectId: ID!, $first: Int!, $after: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          items(first: $first, after: $after) {
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
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    }
  `;

  try {
    let hasNextPage = true;
    let cursor: string | null = null;
    
    while (hasNextPage) {
      const variables = {
        projectId: projectId,
        first: 100,
        after: cursor
      };
      
      const response: any = await graphql(query, {
        ...variables,
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      
      const items = response.node.items.nodes;
      
      for (const item of items) {
        // Look for an item with a matching Story ID field
        for (const fieldValue of item.fieldValues.nodes) {
          if (fieldValue.field && fieldValue.field.name === 'Story ID' && fieldValue.text === storyId) {
            return item.id;
          }
        }
      }
      
      const pageInfo = response.node.items.pageInfo;
      hasNextPage = pageInfo.hasNextPage;
      cursor = pageInfo.endCursor;
    }
    
    return null;
  } catch (error) {
    console.error(`Error searching for existing item with storyId ${storyId}:`, error);
    return null;
  }
}

/**
 * Update an existing project item
 */
async function updateProjectItem(projectId: string, itemId: string, story: Story, token: string): Promise<void> {
  // Try to update as a DraftIssue first
  const updateDraftIssueMutation = `
    mutation($draftIssueId: ID!, $title: String!, $body: String) {
      updateProjectV2DraftIssue(input: {
        draftIssueId: $draftIssueId
        title: $title
        body: $body
      }) {
        draftIssue {
          id
        }
      }
    }
  `;
  
  const updateProjectItemMutation = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: {
          text: $value
        }
      }) {
        projectV2Item {
          id
        }
      }
    }
  `;
  
  const titleMatch = story.content.match(/##\s+(.*)/);
  const title = titleMatch ? titleMatch[1] : "Untitled Story";
  
  try {
    // Try updating as DraftIssue
    await graphql(updateDraftIssueMutation, {
      draftIssueId: itemId,
      title,
      body: story.content,
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    console.log(`Successfully updated draft issue: ${itemId}`);
  } catch (draftError) {
    // If that fails, try updating as ProjectItem
    console.log(`Failed to update as draft issue, trying as project item: ${draftError}`);
    
    // We need to get the body field ID first
    const projectFieldsQuery = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            fields(first:100) {
              nodes {
                ... on ProjectV2Field {
                  id
                  name
                }
              }
            }
          }
        }
      }
    `;

    try {
      const fieldsResult: any = await graphql(projectFieldsQuery, {
        projectId,
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      // Find the "Body" field
      const bodyField = fieldsResult.node.fields.nodes.find((field: any) => field.name === "Body");
      
      if (bodyField) {
        await graphql(updateProjectItemMutation, {
          projectId,
          itemId,
          fieldId: bodyField.id,
          value: story.content,
          headers: {
            authorization: `Bearer ${token}`
          }
        });
        console.log(`Successfully updated project item: ${itemId}`);
      }
    } catch (projectItemError) {
      console.error(`Failed to update as project item: ${projectItemError}`);
      // Re-throw the error so it can be handled upstream
      throw projectItemError;
    }
  }
  
  // Update the status field
  if (story.status && story.status !== "No status") {
    await updateItemStatus(projectId, itemId, story.status, token);
  }
  
  // Update the Story ID field
  await updateItemStoryId(projectId, itemId, story.storyId, token);
}

/**
 * Update the Story ID field of a project item
 */
async function updateItemStoryId(projectId: string, itemId: string, storyId: string, token: string): Promise<void> {
  // First, we need to get the project's field IDs
  const projectFieldsQuery = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first:100) {
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
        }
      }
    }
  `;

  const fieldsResult: any = await graphql(projectFieldsQuery, {
    projectId,
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  // Find the "Story ID" field
  const storyIdField = fieldsResult.node.fields.nodes.find((field: any) => field.name === "Story ID");
  
  if (storyIdField) {
    // Update the field value
    const updateFieldMutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: {
            text: $value
          }
        }) {
          projectV2Item {
            id
          }
        }
      }
    `;

    try {
      await graphql(updateFieldMutation, {
        projectId,
        itemId,
        fieldId: storyIdField.id,
        value: storyId,
        headers: {
          authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error(`Failed to update item Story ID:`, error);
    }
  }
}

/**
 * Create or update a project item
 * @param projectId GitHub Project ID
 * @param story Story object containing content, status, and storyId
 * @param token GitHub token
 * @returns Project item ID
 */
async function createOrUpdateProjectItem(projectId: string, story: Story, token: string): Promise<string> {
  // Check if an item with this story ID already exists
  const existingItemId = await findExistingItem(projectId, story.storyId, token);
  
  if (existingItemId) {
    // Update existing item
    console.log(`Updating existing item with ID: ${existingItemId} for story: ${story.title}`);
    await updateProjectItem(projectId, existingItemId, story, token);
    return existingItemId;
  } else {
    // Create new item
    console.log(`Creating new item for story: ${story.title}`);
    return await createProjectItem(projectId, story.content, story.status, story.storyId, token);
  }
}

/**
 * Create a project item
 * @param projectId GitHub Project ID
 * @param content Content of the project item
 * @param status Status for the project item
 * @param storyId Story ID for the project item
 * @param token GitHub token
 * @returns Project item ID
 */
async function createProjectItem(projectId: string, content: string, status: string, storyId: string, token: string): Promise<string> {
  // Create a draft issue directly in the project (no repository needed)
  const createItemMutation = `
    mutation($projectId: ID!, $title: String!, $body: String) {
      addProjectV2DraftIssue(input: { 
        projectId: $projectId
        title: $title
        body: $body
      }) {
        projectItem {
          id
        }
      }
    }
  `;
  
  // Extract title from content (first line after ## )
  const titleMatch = content.match(/##\s+(.*)/);
  const title = titleMatch ? titleMatch[1] : "Untitled Story";
  
  const itemResult: any = await graphql(createItemMutation, {
    projectId,
    title,
    body: content,
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  
  const itemId = itemResult.addProjectV2DraftIssue.projectItem.id;
  
  // Update the status field if it's not the default "No status"
  if (status && status !== "No status") {
    await updateItemStatus(projectId, itemId, status, token);
  }
  
  // Update the Story ID field
  await updateItemStoryId(projectId, itemId, storyId, token);
  
  return itemId;
}

/**
 * Update the status field of a project item
 */
async function updateItemStatus(projectId: string, itemId: string, status: string, token: string): Promise<void> {
  console.log(`Attempting to update status for item ${itemId} to: ${status}`);
  
  // First, we need to get the project's field IDs
  const projectFieldsQuery = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first:100) {
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
        }
      }
    }
  `;

  const fieldsResult: any = await graphql(projectFieldsQuery, {
    projectId,
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  // Find the "Status" field
  const statusField = fieldsResult.node.fields.nodes.find((field: any) => field.name === "Status");
  
  if (!statusField) {
    console.warn(`Status field not found in project. Status will not be updated for item ${itemId}.`);
    return;
  }

  // Find the option ID for the desired status
  // Handle case where status might be in different case or contain extra spaces
  const normalizedStatus = status.trim().toLowerCase();
  const statusOption = statusField.options.find((option: any) => {
    const normalizedOptionName = option.name.trim().toLowerCase();
    return normalizedOptionName === normalizedStatus;
  });

  if (statusOption) {
    // Update the field value
    const updateFieldMutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: {
            singleSelectOptionId: $optionId
          }
        }) {
          projectV2Item {
            id
          }
        }
      }
    `;

    try {
      await graphql(updateFieldMutation, {
        projectId,
        itemId,
        fieldId: statusField.id,
        optionId: statusOption.id,
        headers: {
          authorization: `Bearer ${token}`
        }
      });
      console.log(`Successfully updated item ${itemId} status to ${status}`);
    } catch (error) {
      console.error(`Failed to update item status:`, error);
    }
  } else {
    // If the exact status option doesn't exist, try to find a close match
    const similarOptions = statusField.options.filter((option: any) => {
      const normalizedOptionName = option.name.trim().toLowerCase();
      return normalizedOptionName.includes(normalizedStatus) || normalizedStatus.includes(normalizedOptionName);
    });

    if (similarOptions.length > 0) {
      // Use the first matching option
      const closestMatch = similarOptions[0];
      console.warn(`Exact status option '${status}' not found. Using closest match: '${closestMatch.name}'`);

      const updateFieldMutation = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: {
              singleSelectOptionId: $optionId
            }
          }) {
            projectV2Item {
              id
            }
          }
        }
      `;

      try {
        await graphql(updateFieldMutation, {
          projectId,
          itemId,
          fieldId: statusField.id,
          optionId: closestMatch.id,
          headers: {
            authorization: `Bearer ${token}`
          }
        });
        console.log(`Successfully updated item ${itemId} status to ${closestMatch.name}`);
      } catch (error) {
        console.error(`Failed to update item status with closest match:`, error);
      }
    } else {
      // If no similar options found, log an error but continue
      console.error(`Status option '${status}' not found in Status field options. Available options:`, 
        statusField.options.map((opt: any) => opt.name));
    }
  }
}

/**
 * Main function to sync stories to project board
 */
export async function syncStoriesToProject(storiesDirPath?: string): Promise<void> {
  const projectId = process.env.PROJECT_ID;
  const token = process.env.GITHUB_TOKEN;
  
  if (!projectId || !token) {
    throw new Error("Missing required environment variables: PROJECT_ID or GITHUB_TOKEN");
  }
  
  try {
    // Read all story files
    // Use provided path, or default to "stories" directory relative to current working directory
    const storiesDir = storiesDirPath || path.join(process.cwd(), "stories");
    const files = await fs.readdir(storiesDir);
    
    // Process each story file
    for (const file of files) {
      if (file.endsWith(".md")) {
        const filePath = path.join(storiesDir, file);
        
        // Skip files that don't follow the story format (like todo-list-example.md)
        const fileContent = await fs.readFile(filePath, "utf8");
        if (!fileContent.startsWith("## Story: ")) {
          console.log(`Skipping ${file} as it doesn't follow the story format`);
          continue;
        }
        
        const story = await parseStoryFile(filePath);
        
        // Create or update project item
        try {
          const itemId = await createOrUpdateProjectItem(projectId, story, token);
          console.log(`Successfully synced story: ${story.title} with item ID: ${itemId}`);
        } catch (error) {
          console.error(`Failed to sync story: ${story.title}`, error);
        }
      }
    }
    
    console.log("Stories sync completed");
  } catch (error) {
    console.error("Error during sync:", error);
    throw error;
  }
}

// Run the sync if this file is executed directly
if (require.main === module) {
  // Allow passing custom stories directory as command line argument
  const storiesDir = process.argv[2];
  syncStoriesToProject(storiesDir).catch(error => {
    console.error("Sync failed:", error);
    process.exit(1);
  });
}
