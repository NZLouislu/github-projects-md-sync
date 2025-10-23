import { parseStoriesFromMarkdown, ParseResult, ParsedStory } from "./multi-story-parser";
import { LogEntry } from "../types";

export interface ImportPlan {
  action: "create" | "skip";
  story: ParsedStory;
  reason?: string;
}

export interface ImportStats {
  created: number;
  skipped: number;
  errors: number;
}

export interface ImportResult {
  stats: ImportStats;
  plans: ImportPlan[];
  warnings: LogEntry[];
  errors: LogEntry[];
}

export interface CreateOnlyImporterOptions {
  dryRun?: boolean;
  existingIds?: Set<string>;
}

/**
 * Create-only importer planner:
 * - If story.id not in existingIds => plan create
 * - If story.id already exists => plan skip
 * - If parser produced errors => propagate as errors (errors>0)
 */
export function planCreateOnlyImportFromMarkdown(content: string, filePath: string, opts: CreateOnlyImporterOptions = {}): ImportResult {
  const existing = opts.existingIds ?? new Set<string>();
  const parsed: ParseResult = parseStoriesFromMarkdown(content, filePath);

  const plans: ImportPlan[] = [];
  const errors: LogEntry[] = [...parsed.errors];
  const warnings: LogEntry[] = [...parsed.warnings];

  for (const s of parsed.stories) {
    if (!s.id || s.id.trim() === "") {
      errors.push({ level: "error", message: "Missing ID", args: [{ file: s.file, line: s.line, title: s.title }] });
      continue;
    }
    if (existing.has(s.id)) {
      plans.push({ action: "skip", story: s, reason: "ID already exists" });
      continue;
    }
    plans.push({ action: "create", story: s });
  }

  const stats: ImportStats = {
    created: plans.filter(p => p.action === "create").length,
    skipped: plans.filter(p => p.action === "skip").length,
    errors: errors.length,
  };

  return { stats, plans, warnings, errors };
}