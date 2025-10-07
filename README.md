# GitHub Projects Markdown Sync

Sync GitHub Projects V2 with Markdown stories

## Overview

This tool allows you to synchronize GitHub Projects (V2) with Markdown files. It enables you to:

1. Convert GitHub Projects board to Markdown format
2. Sync Markdown task lists to GitHub Projects, including proper status mapping
3. Generate story files from project items
4. Sync custom story files from any directory to GitHub Projects

The tool handles the complete synchronization workflow between Markdown documents and GitHub Projects, making it easier to manage project tasks in a version-controlled, text-based format.

## Features

- **Bidirectional Sync**: Convert between GitHub Projects and Markdown formats
- **Status Mapping**: Automatically maps Markdown section headers (To Do, In Progress, Done) to GitHub Project status fields
- **Draft Issue Support**: Create and update draft issues in GitHub Projects V2
- **Flexible Configuration**: Customize field mappings and filtering options
- **TypeScript Support**: Full TypeScript definitions included
- **Story Management**: Create and sync story files with project items
- **Custom Directory Support**: Sync story files from any directory

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

// Sync markdown files to GitHub Project
await mdToProject(projectId, githubToken, './markdown-files');

// Export GitHub Project to markdown files (optional output path)
await projectToMd(projectId, githubToken, './output-dir');
// Or use default './stories' directory
await projectToMd(projectId, githubToken);
```

### Command Line

```bash
# Sync stories from the default 'stories' directory
npx ts-node src/story-to-project-item.ts

# Sync stories from a custom directory
npx ts-node src/story-to-project-item.ts /path/to/your/stories
```

### Examples

See the [examples](examples/) directory for complete usage examples:

1. [example-usage.ts](examples/example-usage.ts) - Complete example of all features
2. [example-usage.test.ts](examples/example-usage.test.ts) - Test examples
3. [md.test.ts](examples/md.test.ts) - Tests for processing markdown files

To run from examples directory:

```bash
cd examples
npm run md
npm run project
npm t examples
npm t examples/md
npm t examples/project
```

## How to get PROJECT_ID (personal GitHub user)

- Create a new issue in your repository first
- Then go to Projects settings -> Manage access, your GitHub username should appear with Admin role

PowerShell to query PROJECT_ID:

```powershell
$token = "your_github_token_with_repo_and_projects_access"
$headers = @{
    Authorization = "Bearer $token"
    "User-Agent"  = "PowerShell"
    Accept        = "application/json"
}

$query = @'
{
  repository(owner: "your_github_username", name: "your_repo_name") {
    projectsV2(first: 10) {
      nodes {
        __typename
        id
        title
      }
    }
  }
}
'@

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

- `projectId`: GitHub Project V2 ID
- `githubToken`: GitHub personal access token
- `sourcePath`: Path to directory containing markdown files

### projectToMd(projectId: string, githubToken: string, outputPath?: string)

Export GitHub Project items to markdown files.

- `projectId`: GitHub Project V2 ID
- `githubToken`: GitHub personal access token
- `outputPath` (optional): Output directory path. Defaults to './stories'

## Story File Format

Story files should follow this format:

```markdown
## Story: Story Title

### Story ID
unique-story-id

### Status
To Do

### Description
Story description

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
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