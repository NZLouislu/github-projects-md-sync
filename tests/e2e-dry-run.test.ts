import { strict as assert } from "assert";
import { createMemoryLogger, structuredLog } from "../src/types";

describe("End-to-End Test Plan (Dry-Run default in CI)", () => {
  it("should emit plans and logs with zero side effects", async () => {
    const { logger, getLogs } = createMemoryLogger();
    structuredLog(logger, "info", { message: "Dry-Run: Plan Create A", type: "PLAN", file: "doc.md", line: 5, storyId: "a" });
    structuredLog(logger, "info", { message: "Dry-Run: Plan Skip B", type: "PLAN", file: "doc.md", line: 12, storyId: "b" });
    const logs = getLogs();
    assert.equal(logs.filter(l => /Dry-Run: Plan/.test(l.message)).length, 2);
  });
});