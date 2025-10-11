import { strict as assert } from "assert";
import { normalizeStatus } from "../../src/utils/status-normalizer";

describe("normalizeStatus", () => {
  it("uses default when empty", () => {
    assert.equal(normalizeStatus(""), "Backlog");
    assert.equal(normalizeStatus(undefined as any), "Backlog");
  });

  it("respects custom default", () => {
    assert.equal(normalizeStatus("", "Ready"), "Ready");
  });

  it("returns noStatusFallback only when default is empty", () => {
    assert.equal(normalizeStatus("", ""), "No status");
    assert.equal(normalizeStatus("", "", "None"), "None");
  });

  it("lowercases and collapses spaces", () => {
    assert.equal(normalizeStatus("  In   PROGRESS "), "in progress");
    assert.equal(normalizeStatus("ReAdY"), "ready");
  });
});