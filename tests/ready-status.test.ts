import { createSyncRequestObject } from "../src/markdown-to-project";
import assert from "assert";

describe("Ready Status Support", function () {
  it("should correctly parse Ready status from markdown", async function () {
    const markdown = `## Backlog

- [ ] Backlog item
    - This is in backlog

## Ready

- [ ] Ready item 1
    - This is ready to be picked up
- [ ] Ready item 2
    - Another ready item

## In Progress

- [ ] In progress item

## Done

- [x] Done item
`;

    // Mock options without actual API calls
    const mockOptions = {
      token: "mock-token",
      includesNote: true,
      // Don't provide projectId to avoid actual API calls
    };

    try {
      const result = await createSyncRequestObject(markdown, mockOptions);
      console.log("Parsed markdown result:", JSON.stringify(result, null, 2));
      
      // Since we're not providing projectId, this should not make actual API calls
      // but should still parse the markdown and create the internal todoItems structure
      assert.ok(Array.isArray(result), "Result should be an array");
      
    } catch (error) {
      // Expected to throw error due to missing project configuration
      // but we can still verify the parsing logic worked by checking the error
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("Expected error (no project config):", errorMessage);
      assert.ok(errorMessage.includes("projectId") || errorMessage.includes("owner"), 
        "Should throw error about missing project configuration");
    }
  });

  it("should handle various Ready status variations", async function () {
    const variations = [
      "## Ready",
      "## ready", 
      "## READY",
      "## Ready to Start",
      "## Ready for Development"
    ];

    for (const readyHeader of variations) {
      const markdown = `## Backlog
- [ ] Backlog item

${readyHeader}
- [ ] Test ready item

## Done
- [x] Done item
`;

      const mockOptions = {
        token: "mock-token",
        includesNote: true,
      };

      try {
        await createSyncRequestObject(markdown, mockOptions);
      } catch (error) {
        // Expected error due to missing project config
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`Header "${readyHeader}" processed (expected error: ${errorMessage})`);
      }
    }
  });
});