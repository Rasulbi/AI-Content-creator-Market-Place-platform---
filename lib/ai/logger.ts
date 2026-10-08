/**
 * Server-Side Structured Logger for AI Service
 * Logs operations, model calls, latency, errors, and validation metrics.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogContext {
  module?: string;
  operation?: string;
  durationMs?: number;
  model?: string;
  error?: unknown;
  [key: string]: unknown;
}

class AILogger {
  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const meta = context ? ` | ${JSON.stringify(context)}` : "";
    return `[AI-LAYER] [${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatMessage("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage("warn", message, context));
  }

  error(message: string, context?: LogContext): void {
    console.error(this.formatMessage("error", message, context));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  async time<T>(
    operationName: string,
    fn: () => Promise<T>,
    context?: Omit<LogContext, "durationMs">
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      this.info(`Completed ${operationName}`, { ...context, durationMs });
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      this.error(`Failed ${operationName}`, { ...context, durationMs, error: String(err) });
      throw err;
    }
  }
}

export const aiLogger = new AILogger();
