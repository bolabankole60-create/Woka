/**
 * Logger Utility
 *
 * Centralized logging with support for different log levels.
 * Formats output with timestamps and color coding.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevel: LogLevel = 'info';

  constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
      this.logLevel = envLevel as LogLevel;
    }
  }

  /**
   * Log a debug message (lowest priority)
   */
  debug(message: string, data?: any): void {
    if (['debug'].includes(this.logLevel)) {
      this._log('debug', message, data);
    }
  }

  /**
   * Log an info message (normal priority)
   */
  info(message: string, data?: any): void {
    if (['debug', 'info'].includes(this.logLevel)) {
      this._log('info', message, data);
    }
  }

  /**
   * Log a warning message (high priority)
   */
  warn(message: string, data?: any): void {
    if (['debug', 'info', 'warn'].includes(this.logLevel)) {
      this._log('warn', message, data);
    }
  }

  /**
   * Log an error message (highest priority)
   */
  error(message: string, error?: Error | any): void {
    this._log('error', message, error);
  }

  /**
   * Internal logging method with formatting
   */
  private _log(level: LogLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m',
    };

    // Format message
    const levelStr = level.toUpperCase().padEnd(5);
    const colorCode = colors[level];
    const resetCode = colors.reset;

    let output = `${colorCode}[${levelStr}]${resetCode} ${timestamp} ${message}`;

    // Add data if provided
    if (data) {
      if (data instanceof Error) {
        output += `\n${data.stack}`;
      } else if (typeof data === 'object') {
        output += `\n${JSON.stringify(data, null, 2)}`;
      } else {
        output += `\n${data}`;
      }
    }

    console.log(output);
  }
}

// Export singleton instance
export const logger = new Logger();
