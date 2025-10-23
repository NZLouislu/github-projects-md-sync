/**
 * One-time ID injection tool (no side effects to importer)
 * - Scan markdown for stories missing id
 * - Generate deterministic ids and patch suggestions
 */
export type IdPatch = { title: string; suggestedId: string; file: string; line: number };

function makeDeterministicId(title: string): string {
  // simple deterministic: lowercased, non-alnum -> '-', collapse dashes, trim
  return title
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generateIdPatches(mdContent: string, file: string): IdPatch[] {
  const lines = mdContent.split(/\r?\n/);
  const patches: IdPatch[] = [];
  let currentTitle: string | null = null;
  let hasId = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // detect story start: "- Story: Title"
    const m = l.match(/^\s*-\s*Story:\s*(.+)$/);
    if (m) {
      if (currentTitle && !hasId) {
        patches.push({
          title: currentTitle,
          suggestedId: makeDeterministicId(currentTitle),
          file,
          line: i
        });
      }
      currentTitle = m[1].trim();
      hasId = false;
      continue;
    }

    if (currentTitle) {
      const idField = l.match(/^\s*story\s*id\s*:\s*(.+)$/i);
      if (idField) {
        const v = (idField[1] || "").trim();
        hasId = v.length > 0;
        continue;
      }
    }
  }

  if (currentTitle && !hasId) {
    patches.push({
      title: currentTitle,
      suggestedId: makeDeterministicId(currentTitle),
      file,
      line: lines.length
    });
  }

  return patches;
}