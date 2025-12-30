import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import https from 'https';
import fs from 'fs';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { hmacAuthMiddleware, ipWhitelistMiddleware } from './middleware/hmacAuth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import vpnRoutes from './routes/vpn.js';
import xuiService from './services/xuiService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8443;

// Middleware
app.use(helmet());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use(limiter);

// IP whitelist
app.use(ipWhitelistMiddleware);

// HMAC authentication
app.use(hmacAuthMiddleware);

// Routes
app.use('/api', vpnRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer() {
  try {
    // Initialize 3x-ui connection
    const loginSuccess = await xuiService.login();
    if (!loginSuccess) {
      logger.error('Failed to connect to 3x-ui panel');
      process.exit(1);
    }

    // Start HTTPS server
    const options = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };

    https.createServer(options, app).listen(PORT, '127.0.0.1', () => {
      logger.info(`API Gateway running on https://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { message: error.message });
    process.exit(1);
  }
}

startServer();
