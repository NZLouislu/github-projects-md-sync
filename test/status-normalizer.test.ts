import { normalizeStatus } from "../src/utils/status-normalizer";
import assert from "assert";

describe("statusNormalizer", function () {
  describe("normalizeStatus", function () {
    it("should normalize status to lowercase and trim spaces", function () {
      assert.strictEqual(normalizeStatus(" To Do "), "to do");
      assert.strictEqual(normalizeStatus("In Progress"), "in progress");
      assert.strictEqual(normalizeStatus("  DONE  "), "done");
    });

    it("should collapse multiple spaces into single space", function () {
      assert.strictEqual(normalizeStatus("To  Do"), "to do");
      assert.strictEqual(normalizeStatus("In   Progress"), "in progress");
      assert.strictEqual(normalizeStatus("  Really    Done  "), "really done");
    });

    it("should return default status when input is empty", function () {
      assert.strictEqual(normalizeStatus(""), "Backlog");
      assert.strictEqual(normalizeStatus("   "), "Backlog");
      assert.strictEqual(normalizeStatus(undefined), "Backlog");
    });

    it("should return custom default status when input is empty", function () {
      assert.strictEqual(normalizeStatus("", "No status"), "No status");
      assert.strictEqual(normalizeStatus("   ", "Custom Default"), "Custom Default");
      assert.strictEqual(normalizeStatus(undefined, "Another Default"), "Another Default");
    });

    it("should return noStatusFallback when input is empty and default is also empty", function () {
      assert.strictEqual(normalizeStatus("", "", "Fallback"), "Fallback");
      assert.strictEqual(normalizeStatus(undefined, "", "Custom Fallback"), "Custom Fallback");
    });

    it("should handle special characters correctly", function () {
      assert.strictEqual(normalizeStatus(" In Review "), "in review");
      assert.strictEqual(normalizeStatus("Needs Testing"), "needs testing");
      assert.strictEqual(normalizeStatus("  Blocked  "), "blocked");
    });

    it("should handle numbers and special characters in status", function () {
      assert.strictEqual(normalizeStatus(" Stage 1 "), "stage 1");
      assert.strictEqual(normalizeStatus("  !Important!  "), "!important!");
    });
  });
});