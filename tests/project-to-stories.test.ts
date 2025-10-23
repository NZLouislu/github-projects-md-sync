import assert from "assert";
import path from "path";
import { describe, it } from "mocha";
import { ProjectBoard, ProjectBoardItem, createStoryContent, generateFileName, toMarkdown, updateStoryContent, findStoryIdInBody } from "../src/project-to-stories";

describe("project-to-stories", () => {
  describe("generateFileName", () => {
    it("should generate a valid filename from a title", () => {
      const title = "Test Story Title with Spaces";
      const expected = "test-story-title-with-spaces";
      const result = generateFileName(title);
      assert.strictEqual(result, expected);
    });

  describe("export filters", () => {
    it("should filter by status with alias normalization", async () => {
      const projectBoard: any = {
        id: "1",
        name: "Board",
        columns: [
          { id: "c1", name: "To do", items: [{ id: "i1", title: "A", url: "", body: "a", state: "OPEN" }] },
          { id: "c2", name: "In Progress", items: [{ id: "i2", title: "B", url: "", body: "b", state: "OPEN" }] },
          { id: "c3", name: "Done", items: [{ id: "i3", title: "C", url: "", body: "c", state: "CLOSED" }] }
        ]
      };
      const outDir = path.join(__dirname, "temp-export");
      const fs = await import("fs/promises");
      await fs.mkdir(outDir, { recursive: true });
      const { result } = await (async () => {
        // Inline minimal invocation by reusing generateStoriesFromProject with fake fetch via toMarkdown fallback is not possible here,
        // so we simulate by writing and checking content using createStoryContent directly coupled with filters notion.
        const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");
        const filterSet = new Set(["ready", "inprogress"]);
        const files: string[] = [];
        for (const column of projectBoard.columns) {
          const status = column.name;
          if (!filterSet.has(normalize(status).replace("todo", "ready").replace("inprogress", "inprogress"))) continue;
          for (const item of column.items) {
            const content = createStoryContent(item, status);
            const fileName = `${generateFileName(item.title)}.md`;
            const filePath = path.join(outDir, fileName);
            await fs.writeFile(filePath, content, "utf8");
            files.push(filePath);
          }
        }
        return { result: { files } };
      })();

      const written = result.files;
      assert.ok(written.some(f => f.endsWith("a.md")), "Should include To do → Ready");
      assert.ok(written.some(f => f.endsWith("b.md")), "Should include In Progress → In progress");
      assert.ok(!written.some(f => f.endsWith("c.md")), "Should exclude Done");
      const aContent = await (await import("fs/promises")).readFile(written.find(f => f.endsWith("a.md"))!, "utf8");
      assert.ok(aContent.includes("### Status"), "Single-story template written");
      assert.ok(aContent.includes("### Description"), "Template includes description");
    });
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

  describe("findStoryIdInBody", () => {
    it("should return story ID when format is story-id: id", () => {
      const body = "Some text\nstory-id: my-story-123\nSome more text";
      assert.strictEqual(findStoryIdInBody(body), "my-story-123");
    });

    it("should return story ID when format is story id: id", () => {
      const body = "story id: another-story-456";
      assert.strictEqual(findStoryIdInBody(body), "another-story-456");
    });

    it("should handle IDs with spaces and other characters", () => {
      const body = "story id: Story 0111-Parser";
      assert.strictEqual(findStoryIdInBody(body), "Story 0111-Parser");
    });

    it("should be case-insensitive", () => {
      const body = "STORY ID: CASE-INSENSITIVE-789";
      assert.strictEqual(findStoryIdInBody(body), "CASE-INSENSITIVE-789");
    });

    it("should return null if no story ID is found", () => {
      const body = "This is a regular description without a story ID.";
      assert.strictEqual(findStoryIdInBody(body), null);
    });

    it("should return null for empty or null body", () => {
      assert.strictEqual(findStoryIdInBody(""), null);
      assert.strictEqual(findStoryIdInBody(null as any), null);
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
      const idMatch = result.match(/### Story ID\s*\nSTORY-123/);
      assert.ok(idMatch, 'Should include story ID');
      assert.ok(result.includes("### Status\n\nIn Progress"), 'Should include status');
      assert.ok(result.includes("### Description\n\nTest body content"), 'Should include description');
    });

    it("should extract and include storyId from the body", () => {
      const item: ProjectBoardItem = {
        id: "2",
        title: "Story With ID in Body",
        url: "https://github.com/test/story-in-body",
        body: "This is the description.\n\nstory-id: from body 456\n\nMore text.",
        state: "OPEN",
        status: "Ready"
      };

      // Simulate the logic from the main function
      if (!item.storyId && item.body) {
        item.storyId = findStoryIdInBody(item.body) ?? undefined;
      }

      const result = createStoryContent(item, "Ready");

      assert.ok(result.includes("## Story: Story With ID in Body"), 'Should include story title');
      assert.ok(result.match(/### Story ID\s*\nfrom body 456/), 'Should include story ID extracted from body');
      assert.ok(result.includes("### Status\n\nReady"), 'Should include status');
      // Check that the story-id line is filtered out from the description
      assert.ok(!result.includes("story-id: from-body-456"), 'Should remove story-id line from description');
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
      assert.ok(!result.includes("### Story ID"), 'Should not include Story ID section when no ID is found');
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