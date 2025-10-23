import { LogEntry } from "../types";

export interface ParsedStory {
  title: string;
  storyId?: string;
  id?: string;
  status: "Backlog" | "Ready" | "In progress" | "In review" | "Done";
  description: string;
  fileName?: string;
  file?: string;
  line?: number;
}

export interface ParseResult {
  stories: ParsedStory[];
  warnings: LogEntry[];
  errors: LogEntry[];
}

function normalizeSection(raw: string): ParsedStory["status"] {
  const s = raw.trim().toLowerCase();
  if (s.startsWith("ready")) return "Ready";
  if (s.startsWith("in review")) return "In review";
  if (s.startsWith("in progress")) return "In progress";
  if (s.startsWith("done")) return "Done";
  if (s.startsWith("backlog")) return "Backlog";
  return "Backlog";
}

function normalizeKey(raw: string): string {
  return raw.replace(/[\s\-_]+/g, "").toLowerCase();
}

function parseFieldKey(line: string) {
  const m = line.match(/^(\s*)([A-Za-z][\w\s\-]*?)\s*:\s*(.*)$/);
  if (!m) return undefined as undefined | { indent: number; key: string; value: string };
  const indent = m[1].length;
  const key = m[2];
  const value = m[3] ?? "";
  return { indent, key, value };
}

export function parseStoriesFromMarkdown(content: string, fileName?: string): ParseResult {
  const lines = content.split(/\r?\n/);
  const stories: ParsedStory[] = [];
  const warnings: LogEntry[] = [];
  const errors: LogEntry[] = [];

  let currentSection: ParsedStory["status"] = "Backlog";
  let cur: ParsedStory | null = null;
  let inDescription = false;

  function endCurrentStory() {
    if (!cur) return;
    if (!cur.storyId) {
      errors.push({
        level: "ERROR",
        message: "Missing ID",
        fileName,
      } as any);
    } else {
      const sid = cur.storyId!;
      if (stories.some(s => s.storyId === sid)) {
        warnings.push({
          level: "WARNING",
          message: `Duplicate ID "${sid}"`,
          fileName,
        } as any);
      } else {
        stories.push(cur);
      }
    }
    cur = null;
    inDescription = false;
  }

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    const sec = l.match(/^\s*##\s+(.*)$/);
    if (sec) {
      currentSection = normalizeSection(sec[1]);
      endCurrentStory();
      continue;
    }

    const storyStart = l.match(/^\s*-\s*Story:\s*(.+)$/);
    if (storyStart) {
      endCurrentStory();
      cur = {
        title: storyStart[1].trim(),
        status: currentSection,
        description: "",
        storyId: undefined,
        id: undefined,
        fileName,
        file: fileName,
        line: i + 1,
      };
      inDescription = false;
      continue;
    }

    if (cur) {
      const fk = parseFieldKey(l);

      if (inDescription) {
        if (fk) {
          const keyNorm = normalizeKey(fk.key);
          if (keyNorm === "storyid") {
            inDescription = false;
            if (fk.value) {
              const idVal = fk.value.trim();
              cur.storyId = idVal;
              cur.id = idVal;
            }
            continue;
          } else if (keyNorm === "description") {
            inDescription = true;
            if (fk.value && fk.value.length > 0) {
              cur.description += fk.value + "\n";
            }
            continue;
          } else {
            if (fk.indent <= 2) {
              inDescription = false;
              warnings.push({
                level: "WARNING",
                message: `Unknown field key "${fk.key}"`,
                fileName,
              } as any);
              i -= 1;
              continue;
            } else {
              cur.description += l.replace(/^\s{0,4}/, "") + "\n";
              continue;
            }
          }
        } else {
          cur.description += l.replace(/^\s{0,4}/, "") + "\n";
          continue;
        }
      }

      if (fk) {
        const keyNorm = normalizeKey(fk.key);

        if (keyNorm === "storyid") {
          if (fk.value) {
            const idVal = fk.value.trim();
            cur.storyId = idVal;
            cur.id = idVal;
          }
          continue;
        }

        if (keyNorm === "description") {
          inDescription = true;
          if (fk.value && fk.value.length > 0) {
            cur.description += fk.value + "\n";
          }
          continue;
        }

        continue;
      }

      continue;
    }
  }

  endCurrentStory();

  return { stories, warnings, errors };
}