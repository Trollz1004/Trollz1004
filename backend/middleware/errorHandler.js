const logger = require('../utils/logger');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userId: req.userId
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation error',
            details: err.details || err.message
        });
    }

    if (err.name === 'UnauthorizedError' || err.message.includes('token')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token'
        });
    }

    if (err.code === '23505') { // PostgreSQL unique violation
        return res.status(409).json({
            error: 'Conflict',
            message: 'Resource already exists'
        });
    }

    if (err.code === '23503') { // PostgreSQL foreign key violation
        return res.status(400).json({
            error: 'Invalid reference',
            message: 'Referenced resource does not exist'
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        error: 'Server error',
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

/**
 * 404 handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.originalUrl} not found`,
        method: req.method
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
