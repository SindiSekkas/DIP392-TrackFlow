// src/utils/errorHandling.ts

// Define possible error types in the application
export type ErrorType = 'AUTH' | 'VALIDATION' | 'SERVER' | 'NETWORK' | 'UNKNOWN';

// Interface for standardized error responses
interface ErrorResponse {
  message: string;
  code?: string;
  type: ErrorType;
}

// User-friendly messages for different error types
const USER_FRIENDLY_MESSAGES = {
  AUTH: 'Authentication error occurred. Please try again.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Service temporarily unavailable. Please try again later.',
  NETWORK: 'Connection error. Please check your internet connection.',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
};

// Custom error class for application-specific errors
export class AppError extends Error {
  type: ErrorType;
  code?: string;

  constructor(type: ErrorType, message?: string, code?: string) {
    super(message || USER_FRIENDLY_MESSAGES[type]);
    this.type = type;
    this.code = code;
  }
}

// Main error handler function
export const handleError = (error: unknown): ErrorResponse => {
  // If it's our custom error, handle it accordingly
  if (error instanceof AppError) {
    return {
      message: process.env.NODE_ENV === 'production' 
        ? USER_FRIENDLY_MESSAGES[error.type]
        : error.message,
      type: error.type,
      code: error.code
    };
  }

  // Log unexpected errors
  console.error('Unhandled error:', error);
  
  return {
    message: USER_FRIENDLY_MESSAGES.UNKNOWN,
    type: 'UNKNOWN'
  };
};

// Error logging function - can be extended to use external logging service
export const logError = (error: unknown, context?: Record<string, unknown>) => {
  console.error('Error:', {
    error,
    context,
    timestamp: new Date().toISOString()
  });
};