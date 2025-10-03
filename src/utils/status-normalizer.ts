/**
 * Normalize status string by:
 * 1. Converting to lowercase
 * 2. Removing extra spaces
 * 3. Providing default values
 * 
 * @param status Status string to normalize
 * @param defaultStatus Default status if input is empty, defaults to "Backlog"
 * @param noStatusFallback Fallback status if no default and input is empty, defaults to "No status"
 * @returns Normalized status string
 */
export function normalizeStatus(
  status: string | undefined,
  defaultStatus: string = "Backlog",
  noStatusFallback: string = "No status"
): string {
  // If status is undefined or empty, use default
  if (!status || status.trim() === "") {
    return defaultStatus || noStatusFallback;
  }

  // Convert to lowercase and remove extra spaces
  return status.trim().toLowerCase().replace(/\s+/g, " ");
}