/**
 * Error handling and retry utilities for resilient API calls
 */

export interface ErrorContext {
  error: any;
  attempt: number;
  maxAttempts: number;
  endpoint?: string;
  method?: string;
  timestamp: Date;
}

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatusCodes?: number[];
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: any, statusCode?: number): boolean {
  // Network errors are retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Retryable HTTP status codes
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  if (statusCode && retryableStatuses.includes(statusCode)) {
    return true;
  }

  // Check if error message indicates transient failure
  const message = error?.message?.toLowerCase() || "";
  if (
    message.includes("timeout") ||
    message.includes("connection refused") ||
    message.includes("econnreset")
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number = 100,
  maxDelayMs: number = 5000,
  multiplier: number = 2,
): number {
  const delay = Math.min(
    initialDelayMs * Math.pow(multiplier, attempt),
    maxDelayMs,
  );
  // Add jitter: ±10%
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.max(100, delay + jitter);
}

/**
 * Retry a fetch call with exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit & { retryOptions?: RetryOptions } = {},
): Promise<Response> {
  const { retryOptions = {}, ...fetchOptions } = options as any;

  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 5000,
    backoffMultiplier = 2,
  } = retryOptions;

  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      // If it's a success or non-retryable error, return/throw immediately
      if (response.ok) {
        return response;
      }

      // Check if this status code is retryable
      if (!isRetryableError(null, response.status)) {
        return response; // Return the error response for caller to handle
      }

      // This is a retryable error, prepare to retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoffDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          backoffMultiplier,
        );
        console.warn(
          `[fetchWithRetry] Attempt ${attempt + 1}/${maxAttempts} failed with HTTP ${response.status}. ` +
            `Retrying in ${delay.toFixed(0)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error)) {
        throw error;
      }

      if (attempt < maxAttempts - 1) {
        const delay = calculateBackoffDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          backoffMultiplier,
        );
        console.warn(
          `[fetchWithRetry] Attempt ${attempt + 1}/${maxAttempts} failed with: ${error instanceof Error ? error.message : String(error)}. ` +
            `Retrying in ${delay.toFixed(0)}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Failed after ${maxAttempts} attempts`);
}

/**
 * Format error for logging
 */
export function formatErrorLog(context: ErrorContext): string {
  const lines = [
    `[Error] ${context.error?.message || String(context.error)}`,
    `[Context] Attempt: ${context.attempt}/${context.maxAttempts}`,
    `[Time] ${context.timestamp.toISOString()}`,
  ];

  if (context.endpoint) {
    lines.push(`[Endpoint] ${context.method || "GET"} ${context.endpoint}`);
  }

  if (context.error?.stack) {
    lines.push(`[Stack] ${context.error.stack}`);
  }

  if (context.error?.cause) {
    lines.push(
      `[Cause] ${context.error.cause instanceof Error ? context.error.cause.message : String(context.error.cause)}`,
    );
  }

  return lines.join("\n");
}

/**
 * Serialize error for JSON logging
 */
export function serializeError(error: any): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause ? serializeError(error.cause) : undefined,
    };
  }

  if (typeof error === "object" && error !== null) {
    return {
      ...error,
      message: error.message || String(error),
    };
  }

  return {
    message: String(error),
  };
}
