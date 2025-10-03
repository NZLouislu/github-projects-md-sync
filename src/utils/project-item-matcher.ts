import { ProjectBoardItem } from "../project-to-stories";

/**
 * Find a project item by storyId or title
 * Priority:
 * 1. Match by storyId if available
 * 2. Match by title if storyId not found
 * 3. Return undefined if neither found
 * 
 * @param items Array of project board items to search through
 * @param storyId Story ID to match (optional)
 * @param title Title to match (optional)
 * @returns Matching project board item or undefined
 */
export function findProjectItemByStoryIdOrTitle(
  items: ProjectBoardItem[],
  storyId?: string,
  title?: string
): ProjectBoardItem | undefined {
  // First try to match by storyId if provided
  if (storyId) {
    const itemByStoryId = items.find(item => item.storyId === storyId);
    if (itemByStoryId) {
      return itemByStoryId;
    }
  }

  // Fallback to match by title if provided
  if (title) {
    const itemByTitle = items.find(item => item.title === title);
    if (itemByTitle) {
      return itemByTitle;
    }
  }

  // If neither found, return undefined
  return undefined;
}