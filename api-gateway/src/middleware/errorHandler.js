import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', { 
    message: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Endpoint not found' });
}
