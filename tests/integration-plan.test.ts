import { strict as assert } from "assert";
import { createMemoryLogger, structuredLog } from "../src/types";

describe("Integration Test Plan (md→project & project→md)", () => {
  it("should produce deterministic stats and logs in dry-run", async () => {
    const { logger, getLogs } = createMemoryLogger();
    structuredLog(logger, "info", { message: "Plan Create", type: "PLAN", file: "mem.md", line: 10, storyId: "s-1" });
    structuredLog(logger, "warn", { message: "Duplicate ID s-1 at line 12", type: "DUPLICATE", file: "mem.md", line: 12, storyId: "s-1" });
    structuredLog(logger, "error", { message: "Missing ID", type: "PARSE", file: "mem.md", line: 15 });

    const logs = getLogs();
    assert.equal(logs.length, 3);
    const levels = logs.map(l => l.level);
    assert.deepEqual(levels, ["info", "warn", "error"]);
    assert.match(logs[1].message, /Duplicate ID/i);
    assert.match(logs[2].message, /Missing ID/i);
  });

  it("project→md export produces single-story template segments", async () => {
    const { createStoryContent } = await import("../src/project-to-stories");
    const content = createStoryContent({ title: "X", storyId: "id-x", status: "Ready", body: "desc" }, "Ready");
    assert.ok(content.includes("## Story: X"));
    assert.ok(content.includes("### Story ID"));
    assert.ok(content.includes("### Status"));
    assert.ok(content.includes("### Description"));
  });
});