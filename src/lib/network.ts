type RetryOptions = {
  retries?: number;
  timeoutMs?: number;
  retryDelayMs?: number;
  shouldRetry?: (error: unknown) => boolean;
};

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

function sleep(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function withRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}) {
  const {
    retries = 2,
    timeoutMs,
    retryDelayMs = 700,
    shouldRetry = () => true,
  } = options;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      const resultPromise = operation();

      return timeoutMs
        ? await withTimeout(resultPromise, timeoutMs, `Request timed out after ${timeoutMs}ms.`)
        : await resultPromise;
    } catch (error) {
      lastError = error;

      if (attempt === retries || !shouldRetry(error)) {
        throw error;
      }

      await sleep(retryDelayMs * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError;
}
