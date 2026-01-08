/**
 * Onboarding Error Handling Utilities
 * Standardized error handling for onboarding flow
 */

export interface OnboardingError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export type OnboardingErrorCode =
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTH_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Create a standardized error object
 */
export function createOnboardingError(
  code: OnboardingErrorCode,
  message: string,
  details?: unknown,
  retryable: boolean = false
): OnboardingError {
  return {
    code,
    message,
    details,
    retryable,
  };
}

/**
 * Parse API error response
 */
export async function parseApiError(
  response: Response
): Promise<OnboardingError> {
  let errorMessage = 'An unexpected error occurred';
  let errorDetails: unknown = null;

  try {
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
      errorDetails = errorData;
    } else {
      const errorText = await response.text();
      errorMessage = errorText || errorMessage;
      errorDetails = errorText;
    }
  } catch (parseError) {
    console.error('[Error Handling] Failed to parse error response:', parseError);
    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  }

  // Determine error code based on status
  let errorCode: OnboardingErrorCode = 'API_ERROR';
  let retryable = false;

  if (response.status === 401 || response.status === 403) {
    errorCode = 'AUTH_ERROR';
  } else if (response.status >= 400 && response.status < 500) {
    errorCode = 'VALIDATION_ERROR';
  } else if (response.status >= 500) {
    errorCode = 'API_ERROR';
    retryable = true;
  } else if (response.status === 0 || !response.ok) {
    errorCode = 'NETWORK_ERROR';
    retryable = true;
  }

  return createOnboardingError(errorCode, errorMessage, errorDetails, retryable);
}

/**
 * Handle fetch errors
 */
export function handleFetchError(error: unknown): OnboardingError {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createOnboardingError(
      'NETWORK_ERROR',
      'Network error. Please check your connection and try again.',
      error,
      true
    );
  }

  if (error instanceof Error) {
    return createOnboardingError(
      'UNKNOWN_ERROR',
      error.message || 'An unexpected error occurred',
      error
    );
  }

  return createOnboardingError(
    'UNKNOWN_ERROR',
    'An unexpected error occurred',
    error
  );
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: OnboardingError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Connection error. Please check your internet connection and try again.';
    case 'AUTH_ERROR':
      return 'Authentication error. Please log in again.';
    case 'VALIDATION_ERROR':
      return error.message || 'Please check your selections and try again.';
    case 'API_ERROR':
      return 'Server error. Please try again in a moment.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: OnboardingError): boolean {
  return error.retryable === true;
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

