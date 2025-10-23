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
  errors: LogEntry[];
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

export interface Logger {
  log(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  args: any[];
  file?: string;
  line?: number;
  storyId?: string;
  type?: string;
}

/**
 * Emit structured log via existing logger, placing structured payload in args[0]
 * Consumers can inspect logs[i].args[0] for file/line/storyId/type, etc.
 */
export function structuredLog(logger: Logger, level: LogEntry['level'], entry: Omit<LogEntry, 'level'|'args'> & { args?: any[] }) {
  const payload = { ...entry };
  const msg = payload.message || '';
  const extra = { ...payload };
  switch (level) {
    case 'info': return logger.info(msg, extra);
    case 'warn': return logger.warn(msg, extra);
    case 'error': return logger.error(msg, extra);
    case 'debug': return logger.debug(msg, extra);
    default: return logger.log(msg, extra);
  }
}

export interface ResultWithLogs<T> {
  result: T;
  logs: LogEntry[];
}

export interface ProjectToMdResult {
    success: boolean;
    outputDir: string;
    files: string[];
    errors: LogEntry[];
}

export interface MdToProjectResult {
    success: boolean;
    processedFiles: number;
    created: number;
    skipped: number;
    errors: LogEntry[];
}

export const createMemoryLogger = (): { logger: Logger, getLogs: () => LogEntry[] } => {
  const logs: LogEntry[] = [];
  const logger: Logger = {
    log: (message: string, ...args: any[]) => logs.push({ level: 'log', message, args }),
    info: (message: string, ...args: any[]) => logs.push({ level: 'info', message, args }),
    warn: (message: string, ...args: any[]) => logs.push({ level: 'warn', message, args }),
    error: (message: string, ...args: any[]) => logs.push({ level: 'error', message, args }),
    debug: (message: string, ...args: any[]) => logs.push({ level: 'debug', message, args }),
  };
  return { logger, getLogs: () => logs };
};