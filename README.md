# GitHub Projects Markdown Sync

Sync GitHub Projects V2 with Markdown stories

## Overview

v0.1.11 introduces a safer, clearer sync model:
- Single entry for md→project with create-only enforcement
- Separated formats: Multi-Story for import, Single-Story for export
- Dry-run diagnostics for CI and previewing plans

This tool synchronises Markdown documents and GitHub Projects (V2) so teams can manage work in text while keeping the project board current.

## Features

- Create-only import: Multi-Story Markdown → GitHub Project items by Story ID
- Read-only export: GitHub Project → Single-Story Markdown files
- Status mapping: Backlog, Ready, In progress, In review, Done (with aliases)
- Deterministic, idempotent behaviour keyed by Story ID
- Dry-run with structured logs for CI gates
- TypeScript API and runnable examples

## Installation

```bash
npm install github-projects-md-sync
```

## Environment

Create a `.env` file:

```env
GITHUB_TOKEN=your_github_token
PROJECT_ID=your_project_id
```

## Usage

### Environment Setup

Create a `.env` file with your GitHub token:

```env
GITHUB_TOKEN=your_github_token_here
PROJECT_ID=your_project_id_here

### CLI

- Import Multi-Story Markdown to a GitHub Project (create-only):
```bash
npm run md -- stories/test-multi-stories-0.1.11.md
```
- Optional dry-run plan:
```bash
npm run md -- stories/test-multi-stories-0.1.11.md --dry-run
```
- Export GitHub Project items to Single-Story Markdown files:
```bash
npm run project
npm run project -- <storyID>
```

### As a Library

```typescript
import { mdToProject, projectToMdWithOptions, projectToMdSingleStory } from 'github-projects-md-sync';

const projectId = process.env.PROJECT_ID!;
const githubToken = process.env.GITHUB_TOKEN!;

const { result: markdownSyncResult } = await mdToProject(projectId, githubToken, './markdown-files');

if (!markdownSyncResult.success) {
  console.error('Failed to sync markdown to project.');
  markdownSyncResult.errors.forEach(error => {
    console.error(`[${error.level.toUpperCase()}] ${error.message}`, ...error.args);
  });
}

const { result: exportResult } = await projectToMdWithOptions({
  projectId,
  githubToken,
  outputPath: './output-dir',
  logLevel: 'info'
});

if (exportResult.success) {
  console.log(`Project items synced to markdown files successfully in ${exportResult.outputDir}.`);
  console.log(`Created or updated ${exportResult.files.length} files.`);
} else {
  console.error('Failed to export project to markdown.');
  exportResult.errors.forEach(error => {
    console.error(`[${error.level.toUpperCase()}] ${error.message}`, ...error.args);
  });
}

const { result: singleStoryResult } = await projectToMdSingleStory(projectId, githubToken, 'Story-1234', './single-story');

if (!singleStoryResult.success) {
  console.error('Failed to export single story.');
  singleStoryResult.errors.forEach(error => {
    console.error(`[${error.level.toUpperCase()}] ${error.message}`, ...error.args);
  });
}
```

### Examples

To use this tool, create a `src/projects` directory with the following structure:
1. src/projects/md-to-project.test.ts — syncs local markdown in src/projects/md to GitHub Projects
2. src/projects/project-to-md.test.ts — exports GitHub Project items to markdown in src/projects/items (default) or a custom path
3. src/projects/md/ — sample markdown inputs used for syncing
4. src/projects/items/ — output directory where exported story markdown files are written

Add the following scripts to your package.json:

```json
{
  "scripts": {
    "md": "ts-node ./src/projects/md-to-project.test.ts",
    "project": "ts-node ./src/projects/project-to-md.test.ts",
    "project:story": "ts-node ./project-to-md.ts --story"
  }
}
```

To run from project root directory:

```bash
npm run md             # runs src/projects/md-to-project.test.ts, syncs local markdown in src/projects/md to GitHub Projects
npm run project        # runs src/projects/project-to-md.test.ts, exports GitHub Project items to markdown in src/projects/items (default)
npm run project:story  # runs project-to-md.ts with --story flag to export a single story interactively
```

### Using project:story

```bash
npm run project:story -- --story Story-1234
```

- Prompts for GitHub token and project ID if env vars `GITHUB_TOKEN` and `PROJECT_ID` are not set
- Generates markdown for the specified story ID under `stories/` by default
- Pass `--output ./custom-dir` to override the output directory

Examples:

```bash
npm run project:story -- --story Story-0112 --output ./stories/single
npm run project -- Story-0456
npm run project ./stories/out-story -- Story-0112
```

## How to get PROJECT_ID (personal GitHub user)

- Create a new issue in your repository first
- Then go to Projects settings -> Manage access, your GitHub username should appear with Admin role

PowerShell to query PROJECT_ID:

```powershell
$owner = "your_github_username"
$repo = "your_repo_name"
$token = "your_github_token_with_repo_and_projects_access"
$headers = @{
    Authorization = "Bearer $token"
    "User-Agent"  = "PowerShell"
    Accept        = "application/json"
}

$query = @"
{
  repository(owner: "$owner", name: "$repo") {
    projectsV2(first: 10) {
      nodes {
        __typename
        id
        title
      }
    }
  }
}
"@

$body = @{ query = $query } | ConvertTo-Json -Depth 5 -Compress

$response = Invoke-RestMethod `
    -Uri "https://api.github.com/graphql" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"

$response.errors
$response.data.repository.projectsV2.nodes | Select-Object id, title
```

## API Reference

### mdToProject(projectId: string, githubToken: string, sourcePath: string)

Sync markdown files from a directory to GitHub Project.

- projectId: GitHub Project V2 ID
- githubToken: GitHub personal access token
- sourcePath: Path to directory containing markdown files

### projectToMd(projectId: string, githubToken: string, outputPath?: string)

Export GitHub Project items to markdown files.

- projectId: GitHub Project V2 ID
- githubToken: GitHub personal access token
- outputPath (optional): Output directory path. Defaults to './stories'

## Story File Format

This tool supports two markdown file formats for defining stories:

### 1. Multi-Story File (for bulk creation)

This format is ideal for quickly creating multiple stories in a single file and syncing them to your GitHub Projects board. One markdown file can contain several stories, grouped under headings that correspond to their status. The default statuses are `Backlog`, `Ready`, `In progress`, `In review`, and `Done`.

This is useful for batch-processing and quickly populating a project board.

### Library

```typescript
import { mdToProject, projectToMd } from 'github-projects-md-sync';

const projectId = process.env.PROJECT_ID as string;
const token = process.env.GITHUB_TOKEN as string;

const mdResult = await mdToProject(projectId, token, './stories');
const projectResult = await projectToMd(projectId, token, './stories');
```

Both functions return `{ result, logs }` with structured diagnostics.

## Story File Formats

Two formats with dedicated responsibilities:
- Multi-Story (for md→project import)
- Single-Story (for project→md export, read-only)

### Multi-Story format (md→project)

Sections represent status. Each story must include `- Story:`, `story id:`, and `description:`.

```
## Backlog

- Story: Setup development environment
  Story ID: Story-001
  Description:
    - Install required tools
    - Configure IDE
    - Setup version control

## Ready

- Story: Implement authentication
  Story ID: Story-002
  Description:
    - Design flows
    - Implement backend
    - Integrate frontend

## In review

- Story: Improve accessibility
  Story ID: Story-003
  Ddescription:
    - Audit key screens
    - Fix critical issues
```

Rules:
- Allowed headings: Backlog, Ready, In progress, In review, Done
- Aliases: `To do → Ready`, `In Progress/in progress → In progress`
- Unrecognised headings map to Backlog
- `story id` must be unique; existing IDs in Project are skipped (no update, no delete)
- Within a file, duplicate IDs: only the first entry is honoured; later duplicates are skipped
- `description:` content is free-form Markdown and preserved verbatim

### Single-Story format (project→md, read-only)

Each file contains exactly one story and includes a `Story ID` section.

```
## Story: Setup development environment

### Story ID

Story-001

### Status

In progress

### Description

- Install required tools
- Configure IDE
- Setup version control
```

This format is generated by export and must not be used for import.

## Import and Export Behaviour

- md→project (import)
  - Input: Multi-Story files only
  - Action: Create new items when `story id` does not exist in Project; skip otherwise
  - No updates or deletes from Markdown
- project→md (export)
  - Output: Multiple Single-Story files, each with `### Story ID`
  - Read-only: do not feed these files back into import

## Story ID

- Matching uses Story ID only; titles never overwrite existing items
- If an item with the same ID exists in Project: skip
- Missing `story id`: strictly skipped and logged with file name, start line, and title
- Missing ID plus exact title match triggers an additional "Possible title duplicate" warning

## Dry-run and Diagnostics

Use dry-run to preview planned operations, with logs covering create plans, skip reasons, missing IDs, duplicates, and unknown keys. Ideal for CI gates and author feedback.

## Migration (≤0.1.10 → 0.1.11)

- Move from per-story import files to a Multi-Story import file
- Ensure each story has a unique `story id`
- Keep edits and deletions within GitHub Project; do not attempt to overwrite via Markdown
- Update scripts or automation to use the new CLI entry points

## Deprecated

- `src/story-to-project-item.ts` is deprecated as an import entry. Use `src/markdown-to-project.ts` via the CLI or library.

## GitHub Actions

### Sync MD to Project

```yaml
name: Sync MD to Project
on:
  push:
    paths:
      - examples/md/**/*.md
  workflow_dispatch:
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - env:
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
        run: npx ts-node examples/md-to-project.ts
```

### Daily Project to MD

```yaml
name: Daily Project to MD
on:
  schedule:
    - cron: "0 16 * * *"
  workflow_dispatch:
jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - env:
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          GITHUB_TOKEN: ${{ secrets.GH_TOKEN }}
        run: npx ts-node examples/project-to-md.ts examples/items
```

## API Reference

### mdToProject(projectId: string, githubToken: string, sourcePath: string)

Import Multi-Story Markdown files from a directory into a GitHub Project. Create-only, idempotent by Story ID.

### projectToMd(projectId: string, githubToken: string, outputPath?: string)

Export GitHub Project items to Single-Story Markdown files. Output directory defaults to `./stories` if not provided.

## Notes

- Requires Node.js 18+
- Runs in Node.js/server environments, not in the browser

## Feedback

If you encounter any problems during use, or have suggestions for improvement, feel free to contact me:

- 🌐 Personal Website: [https://nzlouis.com](https://nzlouis.com)
- 📝 Blog: [https://blog.nzlouis.com](https://blog.nzlouis.com)
- 💼 LinkedIn: [https://www.linkedin.com/in/ailouis](https://www.linkedin.com/in/ailouis)
- 📧 Email: nzlouis.com@gmail.com

You are also welcome to submit feedback directly in [GitHub Issues](https://github.com/nzlouislu/github-projects-md-sync/issues) 🙌

---

If you find this tool helpful, please consider giving it a ⭐️ Star on [GitHub](https://github.com/nzlouislu/github-projects-md-sync) to support the project, or connect with me on [LinkedIn](https://www.linkedin.com/in/ailouis).


