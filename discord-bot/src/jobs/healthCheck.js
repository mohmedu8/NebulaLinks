import cron from 'node-cron';
import apiClient from '../services/apiClient.js';
import { logger } from '../utils/logger.js';

export function startHealthCheck(client) {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const health = await apiClient.healthCheck();

      if (!health.panelConnected) {
        logger.error('API Gateway health check failed', { status: health.status });

        // Send alert to admin channel
        const adminChannel = await client.channels.fetch(process.env.REVIEW_CHANNEL_ID).catch(() => null);
        if (adminChannel) {
          await adminChannel.send('⚠️ **ALERT**: API Gateway is not responding. Please check the connection.');
        }

        // Update bot status
        client.user.setActivity('⚠️ Maintenance', { type: 'WATCHING' });
      } else {
        logger.info('Health check passed');
        client.user.setActivity('VPN Sales', { type: 'WATCHING' });
      }
    } catch (error) {
      logger.error('Error in health check job', { message: error.message });

      const adminChannel = await client.channels.fetch(process.env.REVIEW_CHANNEL_ID).catch(() => null);
      if (adminChannel) {
        await adminChannel.send('⚠️ **ALERT**: Health check failed. API Gateway may be down.');
      }

      client.user.setActivity('⚠️ Maintenance', { type: 'WATCHING' });
    }
  });
}
