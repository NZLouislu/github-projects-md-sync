import path from "path";

export function normalizeKey(key: string): string {
  if (!key) return "";
  return key.toLowerCase().replace(/[\s\-_]/g, "");
}

export function extractStoryId(frontmatter: Record<string, any>, filePath: string): string {
  let storyId: string | undefined;

  // Iterate frontmatter keys and normalize
  for (const [key, value] of Object.entries(frontmatter)) {
    if (normalizeKey(key) === "storyid" && value !== undefined) {
      storyId = String(value);
      break;
    }
  }

  // If storyId is missing → fallback to filename
  if (!storyId) {
    const fileName = path.basename(filePath, ".md");
    storyId = `mdsync-${fileName}`;
  }

  return storyId;
}