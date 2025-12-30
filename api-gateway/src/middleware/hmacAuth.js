import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const TIMESTAMP_WINDOW = 5 * 60 * 1000; // 5 minutes

export function hmacAuthMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const timestamp = req.headers['x-timestamp'];
  const signature = req.headers['x-signature'];

  if (!apiKey || !timestamp || !signature) {
    logger.warn('Missing authentication headers', { ip: req.ip });
    return res.status(401).json({ error: 'Missing authentication headers' });
  }

  // Validate API key
  if (apiKey !== process.env.API_SECRET_KEY) {
    logger.warn('Invalid API key', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid API key' });
  }

  // Validate timestamp (prevent replay attacks)
  const requestTime = parseInt(timestamp);
  const currentTime = Date.now();
  if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > TIMESTAMP_WINDOW) {
    logger.warn('Invalid or expired timestamp', { ip: req.ip, timestamp });
    return res.status(401).json({ error: 'Invalid or expired timestamp' });
  }

  // Build canonical string
  const method = req.method;
  const path = req.path;
  const body = req.body ? JSON.stringify(req.body) : '';
  const canonicalString = `${method}${path}${timestamp}${body}`;

  // Compute expected signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.API_SECRET_KEY)
    .update(canonicalString)
    .digest('hex');

  // Constant-time comparison
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    logger.warn('Invalid signature', { ip: req.ip });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  logger.info('Authentication successful', { ip: req.ip, path });
  next();
}

export function ipWhitelistMiddleware(req, res, next) {
  const allowedIps = process.env.ALLOWED_IPS.split(',').map(ip => ip.trim());
  const clientIp = req.ip || req.connection.remoteAddress;

  if (!allowedIps.includes(clientIp)) {
    logger.warn('IP not whitelisted', { ip: clientIp });
    return res.status(403).json({ error: 'IP not whitelisted' });
  }

  next();
}
