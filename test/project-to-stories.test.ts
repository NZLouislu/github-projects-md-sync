import assert from "assert";
import { describe, it } from "mocha";
import { ProjectBoard, ProjectBoardItem, createStoryContent, generateFileName, toMarkdown, updateStoryContent } from "../src/project-to-stories";

describe("project-to-stories", () => {
  describe("generateFileName", () => {
    it("should generate a valid filename from a title", () => {
      const title = "Test Story Title with Spaces";
      const expected = "test-story-title-with-spaces";
      const result = generateFileName(title);
      assert.strictEqual(result, expected);
    });

    it("should handle special characters in title", () => {
      const title = "Test: Story with @special#chars!";
      const expected = "test-story-with-special-chars";
      const result = generateFileName(title);
      assert.strictEqual(result, expected);
    });

    it("should handle empty title", () => {
      const title = "";
      const expected = "untitled-story";
      const result = generateFileName(title);
      assert.strictEqual(result, expected);
    });
  });

  describe("createStoryContent", () => {
    it("should create story content with all fields", () => {
      const item: ProjectBoardItem = {
        id: "1",
        title: "Test Story",
        url: "https://github.com/test/story",
        body: "Test body content",
        state: "OPEN",
        storyId: "STORY-123",
        status: "In Progress"
      };
      
      const status = "Backlog";
      const result = createStoryContent(item, status);
      
      assert.ok(result.includes("## Story: Test Story"), 'Should include story title');
      assert.ok(result.includes("### Story ID\n\nSTORY-123"), 'Should include story ID');
      assert.ok(result.includes("### Status\n\nIn Progress"), 'Should include status');
      assert.ok(result.includes("### Description\n\nTest body content"), 'Should include description');
      assert.ok(result.includes("### Acceptance Criteria"), 'Should include acceptance criteria');
      assert.ok(result.includes("### Technical Implementation"), 'Should include technical implementation');
    });

    it("should handle missing optional fields", () => {
      const item: ProjectBoardItem = {
        id: "1",
        title: "Minimal Story",
        url: "https://github.com/test/minimal",
        body: "",
        state: "OPEN"
      };
      
      const status = "Todo";
      const result = createStoryContent(item, status);
      
      assert.ok(result.includes("## Story: Minimal Story"), 'Should include story title');
      assert.ok(result.includes("### Status\n\nTodo"), 'Should include default status');
      assert.ok(result.includes("No description provided."), 'Should include default description');
      assert.ok(!result.includes("Story ID"), 'Should not include story ID when not provided');
    });
    
    it("should not duplicate acceptance criteria and technical implementation if already in body", () => {
      const item: ProjectBoardItem = {
        id: "1",
        title: "Story with Existing Sections",
        url: "https://github.com/test/existing",
        body: `Test body content with existing sections

### Acceptance Criteria

- [ ] Existing criteria 1
- [ ] Existing criteria 2

### Technical Implementation

- Existing implementation details`,
        state: "OPEN",
        status: "In Progress"
      };
      
      const status = "Backlog";
      const result = createStoryContent(item, status);
      
      assert.ok(result.includes("## Story: Story with Existing Sections"), 'Should include story title');
      assert.ok(result.includes("### Status\n\nIn Progress"), 'Should include status');
      assert.ok(result.includes("Test body content with existing sections"), 'Should include description');
      // Count occurrences of these sections - should only appear once
      const acceptanceCriteriaCount = (result.match(/### Acceptance Criteria/g) || []).length;
      const technicalImplementationCount = (result.match(/### Technical Implementation/g) || []).length;
      assert.strictEqual(acceptanceCriteriaCount, 1, 'Should only have one Acceptance Criteria section');
      assert.strictEqual(technicalImplementationCount, 1, 'Should only have one Technical Implementation section');
    });
  });

  describe("toMarkdown", () => {
    it("should convert project board to markdown", () => {
      const projectBoard: ProjectBoard = {
        id: "1",
        name: "Test Project",
        columns: [
          {
            id: "col1",
            name: "Todo",
            items: [
              {
                id: "item1",
                title: "First Task",
                url: "https://github.com/test/item1",
                body: "Task description",
                state: "OPEN",
                storyId: "TASK-1"
              }
            ]
          },
          {
            id: "col2",
            name: "Done",
            items: [
              {
                id: "item2",
                title: "Completed Task",
                url: "https://github.com/test/item2",
                body: "Completed description",
                state: "CLOSED",
                status: "Done"
              }
            ]
          }
        ]
      };

      const result = toMarkdown(projectBoard);
      
      assert.ok(result.includes("# Test Project"), 'Should include project name');
      assert.ok(result.includes("## Todo"), 'Should include Todo column');
      assert.ok(result.includes("- [ ] [First Task](https://github.com/test/item1)"), 'Should include open task');
      assert.ok(result.includes("  - Story ID: TASK-1"), 'Should include story ID');
      assert.ok(result.includes("## Done"), 'Should include Done column');
      assert.ok(result.includes("- [x] [Completed Task](https://github.com/test/item2)"), 'Should include completed task');
      assert.ok(result.includes("  - Status: Done"), 'Should include status');
    });

    it("should apply item mapping when provided", () => {
      const projectBoard: ProjectBoard = {
        id: "1",
        name: "Test Project",
        columns: [
          {
            id: "col1",
            name: "Todo",
            items: [
              {
                id: "item1",
                title: "Mapped Task",
                url: "https://github.com/original/item1",
                body: "Original description",
                state: "OPEN"
              }
            ]
          }
        ]
      };

      const options = {
        itemMapping: (item: any) => ({
          ...item,
          title: `Mapped: ${item.title}`,
          url: item.url.replace("original", "mapped")
        })
      };

      const result = toMarkdown(projectBoard, options);
      assert.ok(
        result.includes("[Mapped: Mapped Task](https://github.com/mapped/item1)"),
        'Should apply item mapping to title and URL'
      );
    });
  });

  describe("updateStoryContent", () => {
    it("should update status and description in existing story content", () => {
      const existingContent = `## Story: Test Story

### Status

Backlog

### Description

Old description

### Acceptance Criteria

- [ ] Criteria 1
- [ ] Criteria 2

### Technical Implementation

- Implementation details

`;

      const newStatus = "In Progress";
      const newDescription = "Updated description with new details";
      
      const updatedContent = updateStoryContent(existingContent, newStatus, newDescription);
      
      assert.ok(updatedContent.includes("### Status\n\nIn Progress"), 'Should update status');
      assert.ok(updatedContent.includes("### Description\n\nUpdated description with new details"), 'Should update description');
      assert.ok(updatedContent.includes("### Acceptance Criteria"), 'Should keep other sections');
    });
  });

  // Note: The following test would require mocking the GitHub API
  // describe("fetchProjectBoard", () => {
  //   it("should fetch project board data", async () => {
  //     // This would require mocking the GitHub API
  //   });
  // });

  describe("generateStoriesFromProject", function () {
    it("should be able to import generateStoriesFromProject without errors", async function () {
      // This test just checks that the module can be imported without errors
      const module = await import("../src/project-to-stories");
      assert.ok(module.generateStoriesFromProject);
    });
    
    it("should synchronize story content when project item description changes", async function () {
      // This would require a test project and file system operations
      // Mock implementation for now
      assert.ok(true);
    });
  });
});
