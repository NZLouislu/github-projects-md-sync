# GitHub Projects Markdown Sync

Sync GitHub Projects V2 with Markdown stories

## Overview



This tool allows you to synchronize Markdown files with GitHub Projects (V2).

Markdown files:
![Markdown Example](https://cdn.jsdelivr.net/gh/NZLouislu/github-projects-md-sync@main/images/md.png)

GitHub Projects board:
![Project Board](https://cdn.jsdelivr.net/gh/NZLouislu/github-projects-md-sync@main/images/project.png)


It enables you to:

1. Convert GitHub Projects board to Markdown format
2. Sync Markdown task lists to GitHub Projects, including proper status mapping
3. Generate story files from project items
4. Sync custom story files from any directory to GitHub Projects

The tool handles the complete synchronization workflow between Markdown documents and GitHub Projects, making it easier to manage project tasks in a version-controlled, text-based format.

## Features

- Bidirectional Sync: Convert between GitHub Projects and Markdown formats
- Status Mapping: Automatically maps Markdown section headers (Backlog, Ready, In progress, In review, Done) to GitHub Project status fields
- Draft Issue Support: Create and update draft issues in GitHub Projects V2
- Flexible Configuration: Customize field mappings and filtering options
- TypeScript Support: Full TypeScript definitions included
- Story Management: Create and sync story files with project items
- Custom Directory Support: Sync story files from any directory

## Important Notes

- Node.js Runtime Required: This package requires Node.js environment for file system operations and GitHub API interactions. It can be used in Node.js applications, Next.js API routes, or any server-side JavaScript environment, but cannot run directly in browser environments like React client-side for version 0.1.0.

## Installation

```bash
npm install github-projects-md-sync
```

## Usage

### Environment Setup

Create a `.env` file with your GitHub token:

```env
GITHUB_TOKEN=your_github_token_here
PROJECT_ID=your_project_id_here
```

### As a Library

```typescript
import { mdToProject, projectToMd } from 'github-projects-md-sync';

await mdToProject(projectId, githubToken, './markdown-files');
await projectToMd(projectId, githubToken, './output-dir');
await projectToMd(projectId, githubToken);
```

### Examples

See the examples directory for complete usage examples:

1. examples/md-to-project.ts — syncs local markdown in examples/md to GitHub Projects
2. examples/project-to-md.ts — exports GitHub Project items to markdown in examples/items (default) or a custom path
3. examples/test.ts — example tests launcher for mocha with ts-node
4. examples/md/ — sample markdown inputs used for syncing
5. examples/items/ — output directory where exported story markdown files are written
6. examples/tests/md-to-project.test.ts — tests for syncing markdown to project
7. examples/tests/project-to-md.test.ts — tests for exporting project items to markdown

To run from examples directory:

```bash
cd examples
npm run md        # runs md-to-project.ts, syncs local markdown in examples/md to GitHub Projects
npm run project   # runs project-to-md.ts, exports GitHub Project items to markdown in examples/items (default)
npm t examples    # runs all example tests
npm t examples/md # runs tests for syncing markdown to project
npm t examples/project # runs tests for exporting project to markdown
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

**Example (`/examples/md/test-todo-list.md`):**
```


```


### 2. Single-Story File (for detailed stories)

This format is for defining a single, detailed story in its own file. It typically includes a unique `Story ID` for precise synchronization and more detailed sections for description and acceptance criteria.

**Example:**
```


```


## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run example:test
npm run example:md:test
```

## License

MIT

## GitHub Actions

### Sync MD to Project
- Trigger: push commits that modify files under examples/md (you can change this to any path)
- Purpose: sync markdown in examples/md to a GitHub Project
- Requirements: set repository secrets PROJECT_ID and GH_TOKEN (GH_TOKEN must be a PAT with Organization: Projects Read and write; Repository: Contents Read and write; add Issues/Pull requests as needed)

Create file .github/workflows/sync-md-to-project.yml

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
- Trigger: daily at 05:00 New Zealand time (UTC 16:00, San Francisco 09:00 on the previous day)
- Purpose: export project items to markdown files under examples/items (you can change this to any path)
- Requirements: set repository secrets PROJECT_ID and GH_TOKEN (GH_TOKEN must be a PAT with Organization: Projects Read and write; Repository: Contents Read and write)

Create file .github/workflows/daily-project-to-md.yml

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

After the action is executed, it will automatically commit to Git. To manually execute updates and view the latest md documents, run the command locally.
