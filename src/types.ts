export interface SyncToProjectOptions {
  projectId: string;
  token: string;
  includesNote?: boolean;
  itemMapping?: (item: any) => any;
}

export interface SyncResult {
  success: boolean;
  processedFiles: number;
  syncedItems: number;
  errors: Array<{
    file: string;
    message: string;
    code: string;
  }>;
}

export interface Story {
  title: string;
  status: string;
  content: string;
  fileName: string;
  storyId: string;
}

export interface TodoItem {
  state: 'OPEN' | 'CLOSED';
  title: string;
  body: string;
  url?: string;
}