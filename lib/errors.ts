/**
 * Custom error classes for the application.
 * Provides typed errors with error codes and HTTP status codes.
 */

/**
 * Base application error class.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to a JSON-serializable object for API responses.
   */
  toJSON() {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Validation error for invalid input data.
 * HTTP 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code, 400);
    this.name = 'ValidationError';
  }
}

/**
 * Not found error for missing resources.
 * HTTP 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, code, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * External fetch error for failed external API/URL requests.
 * HTTP 502 Bad Gateway
 */
export class ExternalFetchError extends AppError {
  constructor(message: string, code: string = 'EXTERNAL_FETCH_ERROR') {
    super(message, code, 502);
    this.name = 'ExternalFetchError';
  }
}

/**
 * Rate limit error for too many requests.
 * HTTP 429 Too Many Requests
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMIT_EXCEEDED') {
    super(message, code, 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Helper to create a Response from an AppError.
 */
export function errorResponse(error: AppError): Response {
  return Response.json(error.toJSON(), { status: error.statusCode });
}

/**
 * Helper to handle unknown errors and convert them to AppError.
 */
export function toAppError(error: unknown, fallbackMessage: string = 'An unexpected error occurred'): AppError {
  if (isAppError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(error.message, 'INTERNAL_ERROR', 500);
  }
  return new AppError(fallbackMessage, 'INTERNAL_ERROR', 500);
}

/**
 * Wraps an API route handler with consistent error handling.
 * @param handler - The route handler function
 * @param errorContext - Context string for error logging (e.g., 'Ingest', 'Enhance')
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  errorContext: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      // Handle known application errors
      if (isAppError(error)) {
        return errorResponse(error);
      }
      
      // Log unexpected errors for debugging
      console.error(`${errorContext} error:`, error);
      
      // Convert unknown errors to a generic AppError
      const appError = toAppError(error, `Failed to ${errorContext.toLowerCase()}`);
      return errorResponse(appError);
    }
  }) as T;
}
