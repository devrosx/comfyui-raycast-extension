import { homedir } from "os";
import { resolve, normalize } from "path";

/**
 * Resolve path with ~ expansion and normalize it
 */
export function resolvePath(path: string): string {
  return normalize(resolve(path.replace(/^~\//, `${homedir()}/`)));
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date in locale format
 */
export function formatDate(date: Date, locale = "en-US"): string {
  return `${date.toLocaleDateString(locale)} ${date.toLocaleTimeString(locale)}`;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {},
): Promise<T> {
  const { maxAttempts = 3, delayMs = 1000, backoff = 2, onRetry } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        const delay = delayMs * Math.pow(backoff, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Create abort signal with timeout
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}
