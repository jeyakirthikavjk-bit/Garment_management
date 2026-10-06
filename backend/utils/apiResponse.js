// backend/utils/apiResponse.js
// Standardized JSON API Response Helper

/**
 * Send standard successful JSON response
 * @param {object} res Express response object
 * @param {*} data Response payload
 * @param {string} message Optional description
 * @param {number} statusCode HTTP status code (default: 200)
 */
export function successResponse(res, data = null, message = 'Operation successful', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send standard error JSON response
 * @param {object} res Express response object
 * @param {string} message Error description
 * @param {number} statusCode HTTP status code (default: 500)
 * @param {*} details Optional debug or error details
 */
export function errorResponse(res, message = 'An error occurred', statusCode = 500, details = null) {
  const payload = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };

  if (details) {
    payload.details = details.message || details;
  }

  return res.status(statusCode).json(payload);
}
