import { getTestConfig, ensureConfig } from "./env";
export type ResetResult = { skipped: boolean; reason?: string };
export async function resetProject(): Promise<ResetResult> {
  const cfg = getTestConfig();
  ensureConfig(cfg);
  if (!cfg.allowReset) {
    return { skipped: true, reason: "allowReset=false" };
  }
  return { skipped: true, reason: "not-implemented" };
}