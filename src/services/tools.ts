// const sampleTools: Tool[] = [
//   {
//     name: "createNote",
//     description: "Create a new note with title and content. Each note will be saved with a unique ID",
//     parameters: {
//       type: "object",
//       properties: {
//         title: { type: "string" },
//         content: { type: "string" },
//         tags: { type: "array", items: { type: "string" } }
//       },
//       required: ["title", "content"]
//     },
//     execute: async (params) => `Created note with title: ${params.title}`
//   },
//   {
//     name: "listNotes",
//     description: "List all saved notes with their IDs, titles, and tags. Always try to provide a tag to filter notes efficiently. Listing all notes without a tag should be avoided to prevent information overload",
//     parameters: {
//       type: "object",
//       properties: {
//         tag: { type: "string" }
//       },
//       required: []
//     },
//     execute: async () => "List of notes: [Note1, Note2]"
//   },
//   {
//     name: "viewNote",
//     description: "View the complete content of a specific note by its ID",
//     parameters: {
//       type: "object",
//       properties: {
//         noteId: { type: "string" }
//       },
//       required: ["noteId"]
//     },
//     execute: async (params) => `Note content for ID ${params.noteId}: Sample content`
//   },
//   {
//     name: "replyUser",
//     description: "Reply a message to user",
//     parameters: {
//       type: "object",
//       properties: {
//         message: { type: "string" }
//       },
//       required: ["message"]
//     },
//     execute: async (params) => params.message
//   }
// ];



export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

// 从环境变量获取日志级别
const getLogLevelFromEnv = (): LogLevel => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  switch (envLevel) {
    case 'DEBUG':
      return LogLevel.DEBUG;
    case 'INFO':
      return LogLevel.INFO;
    case 'WARN':
      return LogLevel.WARN;
    case 'ERROR':
      return LogLevel.ERROR;
    default:
      // 默认使用 INFO 级别
      return LogLevel.INFO;
  }
};

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;

  private constructor() {
    this.logLevel = getLogLevelFromEnv();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // 用于测试时手动设置日志级别
  public setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, service: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${service}] ${message}`;
  }

  public error(service: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', service, message), ...args);
    }
  }

  public warn(service: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', service, message), ...args);
    }
  }

  public info(service: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', service, message), ...args);
    }
  }

  public debug(service: string, message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', service, message), ...args);
    }
  }
}

export const logger = Logger.getInstance();