// src/utils/errorHandler.js

// Custom API error class
export class ApiError extends Error {
    constructor(statusCode, message, details = null) {
      super(message);
      this.statusCode = statusCode;
      this.details = details;
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  // Error types with default messages
  export const ErrorTypes = {
    VALIDATION: (details) => new ApiError(400, 'Validation error', details),
    UNAUTHORIZED: () => new ApiError(401, 'Unauthorized access'),
    FORBIDDEN: () => new ApiError(403, 'Insufficient permissions'),
    NOT_FOUND: (resource) => new ApiError(404, `${resource || 'Resource'} not found`),
    CONFLICT: (message) => new ApiError(409, message || 'Resource conflict'),
    SERVER_ERROR: (details) => new ApiError(500, 'Internal server error', details)
  };
  
  // Global error handling middleware
  export const errorMiddleware = (err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error:`, {
      path: req.path,
      method: req.method,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  
    // If it's our API error, use its status code and details
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json({
        error: {
          message: err.message,
          details: err.details
        }
      });
    }
  
    // Handle Supabase errors
    if (err.error_description || err.msg) {
      return res.status(400).json({
        error: {
          message: err.error_description || err.msg,
          code: err.code
        }
      });
    }
  
    // Default to 500 server error
    return res.status(500).json({
      error: {
        message: 'An unexpected error occurred',
        reference: req.id // Optional request ID for tracing
      }
    });
  };