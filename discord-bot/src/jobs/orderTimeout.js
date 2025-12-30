import cron from 'node-cron';
import db from '../services/database.js';
import { logger } from '../utils/logger.js';

export function startOrderTimeout(client) {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      logger.info('Running order timeout job');

      const stmt = db.db.prepare(`
        SELECT * FROM orders 
        WHERE status = 'WAITING_PAYMENT' 
        AND created_at < datetime('now', '-24 hours')
      `);
      const timedOutOrders = stmt.all();

      for (const order of timedOutOrders) {
        try {
          // Update order status
          db.updateOrderStatus(order.id, 'EXPIRED');

          // Send message to order channel
          const channel = await client.channels.fetch(order.channel_id).catch(() => null);
          if (channel) {
            await channel.send('⏰ Order expired due to timeout. Please create a new order to continue.');
          }

          // Create audit log
          db.createAuditLog('ORDER_TIMEOUT', 'SYSTEM', order.id, {
            orderId: order.order_id
          });

          // Schedule channel deletion
          setTimeout(async () => {
            try {
              await channel.delete('Order expired - auto cleanup');
              logger.info('Order channel deleted', { channelId: order.channel_id });
            } catch (error) {
              logger.warn('Could not delete order channel', { channelId: order.channel_id });
            }
          }, 60 * 60 * 1000); // 1 hour

          logger.info('Order timed out', { orderId: order.order_id });
        } catch (error) {
          logger.error('Error timing out order', { orderId: order.order_id, message: error.message });
        }
      }

      logger.info('Order timeout job completed', { timedOut: timedOutOrders.length });
    } catch (error) {
      logger.error('Error in order timeout job', { message: error.message });
    }
  });
}
