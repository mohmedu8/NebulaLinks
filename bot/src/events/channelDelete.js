import db from '../models/database.js';
import logger from '../utils/logger.js';

export default {
  name: 'channelDelete',
  async execute(channel) {
    try {
      // Clean up order records
      const order = await db.get(
        `SELECT * FROM orders WHERE ticket_channel_id = ?`,
        [channel.id]
      );

      if (order) {
        await db.run(
          `UPDATE orders SET ticket_channel_id = NULL WHERE ticket_channel_id = ?`,
          [channel.id]
        );
        logger.info(`Cleaned up order ${order.order_id} after channel deletion`);
      }

      // Clean up bot messages
      await db.run(
        `DELETE FROM bot_messages WHERE channel_id = ?`,
        [channel.id]
      );
    } catch (error) {
      logger.error(`Channel delete handler error: ${error.message}`);
    }
  }
};
