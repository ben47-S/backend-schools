/**
 * Logger Utility
 * Simple logging system with levels and colors
 */

import { env } from '../config/env';

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

// ANSI color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Text colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

interface LogMetadata {
  userId?: string;
  email?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  [key: string]: any;
}

class Logger {
  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private colorize(level: LogLevel, text: string): string {
    if (env.NODE_ENV !== 'development') {
      return text;
    }

    const colorMap = {
      [LogLevel.DEBUG]: colors.gray,
      [LogLevel.INFO]: colors.cyan,
      [LogLevel.WARN]: colors.yellow,
      [LogLevel.ERROR]: colors.red,
    };

    return `${colorMap[level]}${text}${colors.reset}`;
  }

  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = this.formatTimestamp();
    const levelStr = this.colorize(level, `[${level}]`);

    let logMessage = `${timestamp} ${levelStr} ${message}`;

    if (metadata && Object.keys(metadata).length > 0) {
      logMessage += ` ${JSON.stringify(metadata)}`;
    }

    return logMessage;
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (env.NODE_ENV === 'development') {
      console.log(this.formatMessage(LogLevel.DEBUG, message, metadata));
    }
  }

  /**
   * Log informational message
   */
  info(message: string, metadata?: LogMetadata): void {
    console.log(this.formatMessage(LogLevel.INFO, message, metadata));
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    console.warn(this.formatMessage(LogLevel.WARN, message, metadata));
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, metadata?: LogMetadata): void {
    const errorMetadata = {
      ...metadata,
      ...(error && {
        error: error.message,
        stack: env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };

    console.error(this.formatMessage(LogLevel.ERROR, message, errorMetadata));
  }

  /**
   * Log authentication events
   */
  auth(action: string, userId?: string, email?: string, success: boolean = true): void {
    this.info(`Auth: ${action}`, {
      action,
      userId,
      email,
      success,
      type: 'AUTH',
    });
  }

  /**
   * Log CRUD operations
   */
  crud(
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    resource: string,
    userId: string,
    resourceId?: string,
    metadata?: LogMetadata
  ): void {
    this.info(`${action} ${resource}`, {
      action,
      resource,
      resourceId,
      userId,
      type: 'CRUD',
      ...metadata,
    });
  }

  /**
   * Log access control events
   */
  access(
    userId: string,
    resource: string,
    action: string,
    allowed: boolean,
    reason?: string
  ): void {
    const level = allowed ? LogLevel.INFO : LogLevel.WARN;
    const message = `Access ${allowed ? 'granted' : 'denied'}: ${action} on ${resource}`;

    if (allowed) {
      this.info(message, { userId, resource, action, type: 'ACCESS' });
    } else {
      this.warn(message, { userId, resource, action, reason, type: 'ACCESS' });
    }
  }
}

// Export singleton instance
export const logger = new Logger();
