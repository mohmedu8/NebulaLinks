import logger from '../utils/logger.js';

export default {
  name: 'ready',
  once: true,
  async execute(client, xrayClient, healthMonitor) {
    logger.info(`Bot logged in as ${client.user.tag}`);

    // Authenticate with 3x-ui
    const authenticated = await xrayClient.authenticate();
    if (!authenticated) {
      logger.error('Failed to authenticate with 3x-ui panel');
    }

    // Start health monitoring
    healthMonitor.start();

    // Verify admin review channel
    try {
      const adminChannel = await client.channels.fetch(process.env.ADMIN_REVIEW_CHANNEL_ID);
      logger.info(`Admin review channel verified: ${adminChannel.name}`);
    } catch (error) {
      logger.error(`Admin review channel not found: ${process.env.ADMIN_REVIEW_CHANNEL_ID}`);
    }

    // Verify billing dashboard channel
    try {
      const dashboardChannel = await client.channels.fetch(process.env.BILLING_DASHBOARD_CHANNEL_ID);
      logger.info(`Billing dashboard channel verified: ${dashboardChannel.name}`);
    } catch (error) {
      logger.error(`Billing dashboard channel not found: ${process.env.BILLING_DASHBOARD_CHANNEL_ID}`);
    }
  }
};
