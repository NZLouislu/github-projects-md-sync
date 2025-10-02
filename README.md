# GitHub Projects Markdown Sync

Sync GitHub Projects V2 with Markdown stories

## Overview

This tool allows you to synchronize GitHub Projects (V2) with Markdown files. It enables you to:

1. Convert GitHub Projects board to Markdown format
2. Sync Markdown task lists to GitHub Projects, including proper status mapping
3. Generate story files from project items

The tool handles the complete synchronization workflow between Markdown documents and GitHub Projects, making it easier to manage project tasks in a version-controlled, text-based format.

## Features

- **Bidirectional Sync**: Convert between GitHub Projects and Markdown formats
- **Status Mapping**: Automatically maps Markdown section headers (To Do, In Progress, Done) to GitHub Project status fields
- **Draft Issue Support**: Create and update draft issues in GitHub Projects V2
- **Flexible Configuration**: Customize field mappings and filtering options
- **TypeScript Support**: Full TypeScript definitions included
- **Story Management**: Create and sync story files with project items

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

### Programmatic Usage

```typescript
import { syncToProject, toMarkdown, fetchProjectBoard } from 'github-projects-md-sync';

// Sync Markdown to GitHub Project
const markdown = `
## To Do
- [ ] Task 1
- [ ] Task 2

## In Progress
- [ ] Task 3

## Done
- [x] Task 4
`;

await syncToProject(markdown, {
  projectId: process.env.PROJECT_ID,
  token: process.env.GITHUB_TOKEN,
  includesNote: true
});

// Convert GitHub Project to Markdown
const projectBoard = await fetchProjectBoard({
  projectId: process.env.PROJECT_ID,
  token: process.env.GITHUB_TOKEN
});

const markdownOutput = toMarkdown(projectBoard);
console.log(markdownOutput);
```

### Working with Story Files

This tool can work with structured story files that include requirements, acceptance criteria (AC), technical implementation details, and more. 

Below is an example of a properly formatted story file:

```
## Story: Implement Like Functionality on Forecast Card

### Story ID

nzlouis-property-ai-forecast-like-functions

### Status

To do

### Description

As a user, I want to be able to like property cards on the forecast page so that I can save interesting properties for later review and analysis.

<img width="395" height="480" alt="Image" src="https://images.corelogic.asia/768x512/filters:stretch()/assets/nz/perm/ergavsop3mi6pdppk636t3qs44?signature=3a23d04836c05217b7512bb2ba9239e21f3e7949d52ffa1b9ac25a33086b5dff" />

### Acceptance Criteria

#### Scenario 1: Like Property

1. Navigate to the forecast page
2. Locate a property card with a like button/icon
3. Click the like button/icon
4. Verify that the like is recorded and visually indicated

#### Scenario 2: View Liked Properties

1. Like several properties on the forecast page
2. Navigate to the Favorites section/page
3. Verify that all liked properties are displayed
4. Confirm that the like count is accurate

#### Scenario 3: Unlike Property

1. Navigate to the Favorites section/page
2. Locate a previously liked property
3. Click the like button/icon to unlike
4. Verify that the property is removed from favorites

### Technical Implementation

- Create a new API endpoint for managing likes (`/api/likes`)
- Add a likes table to the database with fields for user_id, property_id, and timestamp
- Implement frontend components for displaying and managing likes
- Add necessary service layer logic to handle like operations
- Update property card components to include like functionality
- Create a dedicated Favorites page/component to display liked properties
- Implement visual feedback for liked/unliked states
- Update the forecast page to display the number of likes for each property
```

To sync story files to your GitHub Project board:

```bash
# Sync a single story file
npx github-projects-md-sync sync -i stories/forecast-like-function.md

# Sync all story files
npx github-projects-md-sync sync -d stories/
```

The tool will automatically:
- Extract the story title from the Markdown heading
- Use the Status field to place the item in the correct column
- Preserve all story details in the issue body
- Map Story ID to a custom field if configured in your project

### CLI Usage

After installation, you can use the tool via command line:

```bash
# Export GitHub Project to Markdown
npx github-projects-md-sync export -o project.md

# Sync Markdown to GitHub Project
npx github-projects-md-sync sync -i tasks.md

# Generate story files from existing project
npx github-projects-md-sync generate-stories
```

### Status Mapping

The tool automatically maps Markdown section headers to GitHub Project status fields:

| Markdown Section | GitHub Project Status |
|------------------|----------------------|
| To Do, TODO, To-Do | To Do |
| In Progress, In Progress | In Progress |
| Done, Completed | Done |

This mapping is case-insensitive and handles common variations of section names.

## API Reference

### syncToProject(markdown, options)

Syncs a Markdown document to a GitHub Project.

#### Options

- `projectId`: GitHub Project V2 ID
- `token`: GitHub personal access token
- `includesNote`: Include note-only cards (default: false)
- `itemMapping`: Function to customize item mappings

### fetchProjectBoard(options)

Fetches a GitHub Project board.

#### Options

- `projectId`: GitHub Project V2 ID
- `token`: GitHub personal access token

### toMarkdown(projectBoard, options)

Converts a project board to Markdown format.

#### Options

- `itemMapping`: Function to customize item mappings

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## Requirements

- Node.js 14 or higher
- GitHub personal access token with appropriate permissions
- GitHub Project V2

## License

MIT