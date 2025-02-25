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
  private logLevel: LogLevel;
  private module: string[];

  private static getCallerFile(): string {
    const err = new Error();
    const stack = err.stack?.split('\n') || [];
    // 跳过前三行 (Error, getCallerFile, Constructor)
    const callerLine = stack[3];
    if (!callerLine) return 'unknown';

    // 提取文件名
    const match = callerLine.match(/[\/\\]([^\/\\]+?)\.[^.]+:\d+/);
    return match ? match[1] : 'unknown';
  }

  public constructor(module?: string | string[]) {
    this.logLevel = getLogLevelFromEnv();
    const callerFile = Logger.getCallerFile();
    const baseModule = module ? (Array.isArray(module) ? module : [module]) : [callerFile];
    this.module = baseModule;
  }

  public sub(module: string): Logger {
    return new Logger([...this.module, module]);
  }

  // 用于测试时手动设置日志级别
  public setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    const moduleStr = this.module.join(':');
    return `[${timestamp}] [${level}] [${moduleStr}] ${message}`;
  }

  public error(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message), ...args);
    }
  }

  public warn(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message), ...args);
    }
  }

  public info(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message), ...args);
    }
  }

  public debug(message: string, ...args: any[]) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message), ...args);
    }
  }
}
