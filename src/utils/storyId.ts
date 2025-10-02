import path from "path";

export function normalizeKey(key: string): string {
  if (!key) return "";
  return key.toLowerCase().replace(/[\s\-_]/g, "");
}

export function extractStoryId(frontmatter: Record<string, any>, filePath: string): string {
  let storyId: string | undefined;

  // 遍历 frontmatter keys，归一化
  for (const [key, value] of Object.entries(frontmatter)) {
    if (normalizeKey(key) === "storyid" && value !== undefined) {
      storyId = String(value);
      break;
    }
  }

  // 如果没有 storyId → fallback 用文件名
  if (!storyId) {
    const fileName = path.basename(filePath, ".md");
    storyId = `mdsync-${fileName}`;
  }

  return storyId;
}