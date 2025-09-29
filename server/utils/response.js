// Standardized API response utility
// Ensures consistent response format across all controllers

/**
 * Send successful response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {*} data - Response data
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
export const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = {}) => {
  const response = {
    success: true,
    message,
    ...(data !== null && { data }),
    ...meta
  };

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {*} errors - Detailed errors (validation errors, etc.)
 * @param {String} errorCode - Application-specific error code
 */
export const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null, errorCode = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(errorCode && { errorCode }),
    timestamp: new Date().toISOString()
  };

  return res.status(statusCode).json(response);
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {*} errors - Validation errors
 */
export const sendValidationError = (res, errors) => {
  return sendError(res, 400, 'Validation failed', errors, 'VALIDATION_ERROR');
};

/**
 * Send authentication error response
 * @param {Object} res - Express response object
 * @param {String} message - Custom message
 */
export const sendAuthError = (res, message = 'Authentication required') => {
  return sendError(res, 401, message, null, 'AUTH_ERROR');
};

/**
 * Send authorization error response
 * @param {Object} res - Express response object
 * @param {String} message - Custom message
 */
export const sendAuthorizationError = (res, message = 'Access denied') => {
  return sendError(res, 403, message, null, 'AUTHORIZATION_ERROR');
};

/**
 * Send not found error response
 * @param {Object} res - Express response object
 * @param {String} resource - Resource name
 */
export const sendNotFoundError = (res, resource = 'Resource') => {
  return sendError(res, 404, `${resource} not found`, null, 'NOT_FOUND');
};

/**
 * Send conflict error response
 * @param {Object} res - Express response object
 * @param {String} message - Conflict message
 */
export const sendConflictError = (res, message = 'Resource already exists') => {
  return sendError(res, 409, message, null, 'CONFLICT_ERROR');
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data
 * @param {Number} total - Total count
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {String} message - Success message
 */
export const sendPaginatedResponse = (res, data, total, page, limit, message = 'Data retrieved successfully') => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const meta = {
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages,
      hasNext,
      hasPrev
    }
  };

  return sendSuccess(res, 200, message, data, meta);
};

/**
 * Handle Mongoose validation errors
 * @param {Object} error - Mongoose error object
 */
export const formatMongooseError = (error) => {
  if (error.name === 'ValidationError') {
    const errors = {};
    Object.keys(error.errors).forEach(key => {
      errors[key] = error.errors[key].message;
    });
    return errors;
  }

  if (error.name === 'CastError') {
    return { [error.path]: 'Invalid ID format' };
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return { [field]: `${field} already exists` };
  }

  return null;
};

/**
 * Express error middleware wrapper
 * @param {Function} fn - Async function to wrap
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global error handler middleware
 * Should be used as the last middleware in the application
 */
export const globalErrorHandler = (err, req, res, next) => {
  console.error('Global Error Handler:', err);

  // Mongoose validation error
  const mongooseErrors = formatMongooseError(err);
  if (mongooseErrors) {
    return sendValidationError(res, mongooseErrors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendAuthError(res, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return sendAuthError(res, 'Token expired');
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, statusCode, message, null, 'INTERNAL_ERROR');
};