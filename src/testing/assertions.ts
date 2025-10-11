import { ResultWithLogs, LogEntry } from "../types";
export type CompareResult = { equal: boolean; diffs: string[] };
export function assertNoErrors(logs: LogEntry[]) {
  const errors = logs.filter(l => l.level === "error");
  if (errors.length) {
    const msgs = errors.map(e => e.message).join("; ");
    throw new Error("Error logs detected: " + msgs);
  }
}
export function compareStringsNormalized(a: string, b: string): CompareResult {
  const na = a.replace(/\r\n/g, "\n").trim();
  const nb = b.replace(/\r\n/g, "\n").trim();
  return { equal: na === nb, diffs: na === nb ? [] : ["content-diff"] };
}
export function expectSuccess<T>(res: ResultWithLogs<T>) {
  assertNoErrors(res.logs);
}