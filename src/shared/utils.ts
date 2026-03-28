/**
 * Shared utilities for WikiJS MCP Server
 * Logging, request ID generation, and common types
 */

/**
 * Generate unique request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sanitize and normalize wiki page path
 * - Ensures leading slash
 * - Removes trailing slashes
 * - Removes double slashes
 * - Trims whitespace
 */
export function sanitizePath(path: string): string {
  let sanitized = path.trim();

  // Remove leading slash if present (we'll add it back)
  sanitized = sanitized.replace(/^\/+/, "");

  // Remove trailing slashes
  sanitized = sanitized.replace(/\/+$/, "");

  // Remove double slashes
  sanitized = sanitized.replace(/\/+/g, "/");

  // Add single leading slash
  return "/" + sanitized;
}

/**
 * Structured logger for MCP operations
 */
export class MCPLogger {
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  private log(
    level: string,
    message: string,
    context?: Record<string, unknown>,
  ) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      requestId: this.requestId,
      message,
      ...context,
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("INFO", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("WARN", message, context);
  }

  error(message: string, context?: Record<string, unknown>) {
    this.log("ERROR", message, context);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("DEBUG", message, context);
  }
}
