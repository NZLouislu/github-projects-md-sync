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
import { syncStoriesToProject, syncToProject, fetchProjectBoard, toMarkdown } from 'github-projects-md-sync';

// Sync story files from the default 'stories' directory
await syncStoriesToProject();

// Sync story files from a custom directory
await syncStoriesToProject('/path/to/your/stories');

// Sync markdown content to GitHub Project
const markdown = `
## To Do
- [ ] Task 1
- [ ] Task 2

## In Progress
- [ ] Task 3

## Done
- [x] Task 4
`;

const options = {
  projectId: process.env.PROJECT_ID,
  token: process.env.GITHUB_TOKEN,
  includesNote: true
};

await syncToProject(markdown, options);

// Export GitHub Project to Markdown
const projectBoard = await fetchProjectBoard({
  projectId: process.env.PROJECT_ID,
  token: process.env.GITHUB_TOKEN
});

const markdownOutput = toMarkdown(projectBoard);
console.log(markdownOutput);
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

To run the examples:

```bash
npm run example
npm run example:test
npm run example:md:test
```

## API Reference

### syncStoriesToProject(storiesDirPath?: string)

Sync story files to GitHub Project.

- `storiesDirPath` (optional): Path to the directory containing story files. Defaults to `./stories`.

### syncToProject(markdown: string, options: SyncToProjectOptions)

Sync Markdown content to GitHub Project.

- `markdown`: Markdown content to sync
- `options`: Configuration options

### fetchProjectBoard(options: FetchProjectBoardOptions)

Fetch project board data from GitHub.

### toMarkdown(projectBoard: ProjectBoard)

Convert project board to Markdown format.

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