import { strict as assert } from "assert";
import { createMemoryLogger, structuredLog, LogEntry } from "../src/types";

describe("Logging Levels and Structure", () => {
  it("should route levels and attach structured payload", () => {
    const { logger, getLogs } = createMemoryLogger();
    structuredLog(logger, "info", { message: "Created item", storyId: "S-1", type: "CREATE", file: "mem.md", line: 10 });
    structuredLog(logger, "warn", { message: "Duplicate id", storyId: "S-1", type: "DUPLICATE", file: "mem.md", line: 12 });
    structuredLog(logger, "error", { message: "Missing ID", type: "PARSE", file: "mem.md", line: 15 });

    const logs = getLogs();
    assert.equal(logs.length, 3);

    const info = logs[0];
    assert.equal(info.level, "info");
    assert.match(info.message, /Created item/);
    assert.ok(Array.isArray(info.args));
    const infoPayload = info.args[0] as Partial<LogEntry>;
    assert.equal(infoPayload.storyId, "S-1");
    assert.equal(infoPayload.type, "CREATE");
    assert.equal(infoPayload.file, "mem.md");
    assert.equal(infoPayload.line, 10);

    const warn = logs[1];
    assert.equal(warn.level, "warn");
    const warnPayload = warn.args[0] as Partial<LogEntry>;
    assert.equal(warnPayload.type, "DUPLICATE");

    const err = logs[2];
    assert.equal(err.level, "error");
    const errPayload = err.args[0] as Partial<LogEntry>;
    assert.equal(errPayload.type, "PARSE");
    assert.equal(errPayload.file, "mem.md");
  });
});