import dotenv from "dotenv";
dotenv.config();
export type TestConfig = { githubToken: string; testProjectId: string; outputDir: string; logLevel: "debug"|"info"|"warn"|"error"; cleanup: boolean; dataDir: string; retryMax: number; retryBackoffMs: number; dryRun: boolean; allowReset: boolean; };
export function getTestConfig(): TestConfig {
  const githubToken = process.env.GITHUB_TOKEN || "";
  const testProjectId = process.env.TEST_PROJECT_ID || "";
  const outputDir = process.env.TEST_OUTPUT_DIR || ".tmp/stories";
  const logLevel = (process.env.TEST_LOG_LEVEL as TestConfig["logLevel"]) || "debug";
  const cleanup = (process.env.TEST_CLEANUP || "false").toLowerCase() === "true";
  const dataDir = process.env.TEST_DATA_DIR || "examples";
  const retryMax = parseInt(process.env.TEST_RETRY_MAX || "3", 10);
  const retryBackoffMs = parseInt(process.env.TEST_RETRY_BACKOFF_MS || "500", 10);
  const dryRun = (process.env.TEST_DRY_RUN || "false").toLowerCase() === "true";
  const allowReset = (process.env.ALLOW_RESET || "false").toLowerCase() === "true";
  return { githubToken, testProjectId, outputDir, logLevel, cleanup, dataDir, retryMax, retryBackoffMs, dryRun, allowReset };
}
export function ensureConfig(c: TestConfig) {
  if (!c.githubToken) throw new Error("GITHUB_TOKEN missing");
  if (!c.testProjectId) throw new Error("TEST_PROJECT_ID missing");
}