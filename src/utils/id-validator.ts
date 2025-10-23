export type IdValidationIssue = {
  type: "MISSING" | "WHITESPACE" | "LENGTH" | "CHARSET" | "DUPLICATE";
  message: string;
  suggestion?: string;
};

export type IdValidationResult = {
  valid: boolean;
  issues: IdValidationIssue[];
};

const DEFAULT_MIN_LEN = 3;
const DEFAULT_MAX_LEN = 64;
const ALLOWED = /^[A-Za-z0-9._-]+$/;

/**
 * Validate a story id format and duplicates
 * - Trim required
 * - Charset: letters, digits, dot, underscore, hyphen
 * - Length: [min, max]
 * - Duplicate: optional set check
 */
export function validateStoryId(
  raw: string | undefined | null,
  existing?: Set<string>,
  minLen = DEFAULT_MIN_LEN,
  maxLen = DEFAULT_MAX_LEN
): IdValidationResult {
  const issues: IdValidationIssue[] = [];
  if (raw == null || String(raw).trim().length === 0) {
    issues.push({
      type: "MISSING",
      message: "Missing ID",
      suggestion: "Please provide a unique, non-empty story id for each story"
    });
    return { valid: false, issues };
  }

  const id = String(raw);
  if (id !== id.trim()) {
    issues.push({
      type: "WHITESPACE",
      message: "ID has leading or trailing whitespace",
      suggestion: "Please remove leading/trailing whitespace"
    });
  }

  const trimmed = id.trim();
  if (trimmed.length < minLen || trimmed.length > maxLen) {
    issues.push({
      type: "LENGTH",
      message: `ID length should be between ${minLen}-${maxLen}`,
      suggestion: "Please adjust ID length to the allowed range"
    });
  }

  if (!ALLOWED.test(trimmed)) {
    issues.push({
      type: "CHARSET",
      message: "ID allows only letters, digits, dot, underscore, and hyphen",
      suggestion: "Please replace with allowed characters"
    });
  }

  if (existing && existing.has(trimmed)) {
    issues.push({
      type: "DUPLICATE",
      message: `Duplicate ID: ${trimmed}`,
      suggestion: "Please use a unique ID"
    });
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Provide a minimal usable template and a validation checklist
 */
export const idGuidelines = {
  template: "my-project-feature-abc123",
  checklist: [
    "Provide a non-empty ID",
    "Avoid leading/trailing whitespace",
    "Use only letters/digits/._-",
    `Length ${DEFAULT_MIN_LEN}-${DEFAULT_MAX_LEN}`,
    "Avoid duplicates"
  ]
};