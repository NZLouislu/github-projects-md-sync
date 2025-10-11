import { graphql } from "@octokit/graphql";
import { fetchProjectBoard } from "../project-to-stories";

type FieldsInfo = { statusFieldId: string; statusOptions: { id: string; name: string }[] };

async function getFields(projectId: string, token: string): Promise<FieldsInfo> {
  const query = `query($projectId: ID!) {
    node(id: $projectId) {
      ... on ProjectV2 {
        id
        fields(first: 100) {
          nodes {
            ... on ProjectV2SingleSelectField {
              id
              name
              options { id name }
            }
          }
        }
      }
    }
  }`;
  const res: any = await graphql(query, {
    projectId,
    headers: { authorization: `Bearer ${token}` }
  });
  const nodes = res.node?.fields?.nodes || [];
  const statusField = nodes.find((f: any) => f && f.name === "Status");
  if (!statusField) throw new Error("Status field not found on project");
  return { statusFieldId: statusField.id, statusOptions: statusField.options || [] };
}

export async function findItemByTitle(projectId: string, token: string, title: string): Promise<{ projectItemId: string; contentId: string } | null> {
  const board = await fetchProjectBoard({ projectId, token });
  for (const col of board.columns) {
    for (const it of col.items) {
      const t1 = (it.title || "").replace(/^Story:\s*/, "").trim();
      const t2 = title.replace(/^Story:\s*/, "").trim();
      if (t1 === t2 && it.projectItemId && it.id) {
        return { projectItemId: it.projectItemId, contentId: it.id };
      }
    }
  }
  return null;
}

export async function setItemStatus(projectId: string, token: string, projectItemId: string, statusName: string): Promise<void> {
  const { statusFieldId, statusOptions } = await getFields(projectId, token);
  const norm = (s: string) => (s || "").toLowerCase().replace(/\s+/g, "");
  const opt = statusOptions.find(o => norm(o.name) === norm(statusName));
  if (!opt) throw new Error(`Status option not found: ${statusName}`);
  const mutation = `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optId: String!) {
    updateProjectV2ItemFieldValue(input: {
      projectId: $projectId
      itemId: $itemId
      fieldId: $fieldId
      value: { singleSelectOptionId: $optId }
    }) { projectV2Item { id } }
  }`;
  await graphql(mutation, {
    projectId,
    itemId: projectItemId,
    fieldId: statusFieldId,
    optId: opt.id,
    headers: { authorization: `Bearer ${token}` }
  });
}

export async function updateDraftIssueContent(token: string, draftIssueId: string, patch: { title?: string; body?: string }): Promise<void> {
  const hasTitle = typeof patch.title === "string";
  const hasBody = typeof patch.body === "string";
  if (!hasTitle && !hasBody) return;

  if (hasTitle && hasBody) {
    const mutation = `mutation($id: ID!, $title: String!, $body: String!) {
      updateProjectV2DraftIssue(input: { draftIssueId: $id, title: $title, body: $body }) { draftIssue { id } }
    }`;
    await graphql(mutation, { id: draftIssueId, title: patch.title!, body: patch.body!, headers: { authorization: `Bearer ${token}` } });
    return;
  }

  if (hasTitle) {
    const mutation = `mutation($id: ID!, $title: String!) {
      updateProjectV2DraftIssue(input: { draftIssueId: $id, title: $title }) { draftIssue { id } }
    }`;
    await graphql(mutation, { id: draftIssueId, title: patch.title!, headers: { authorization: `Bearer ${token}` } });
    return;
  }

  if (hasBody) {
    const mutation = `mutation($id: ID!, $body: String!) {
      updateProjectV2DraftIssue(input: { draftIssueId: $id, body: $body }) { draftIssue { id } }
    }`;
    await graphql(mutation, { id: draftIssueId, body: patch.body!, headers: { authorization: `Bearer ${token}` } });
  }
}