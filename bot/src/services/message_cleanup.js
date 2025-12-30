import db from '../models/database.js';
import logger from '../utils/logger.js';

export class MessageCleanup {
  constructor(client) {
    this.client = client;
    this.cleanupInterval = 30 * 60 * 1000; // 30 minutes
  }

  async start() {
    logger.info('Message cleanup service started');
    this.intervalId = setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  async cleanup() {
    try {
      const now = Math.floor(Date.now() / 1000);

      // Get messages marked for deletion
      const messages = await db.all(
        `SELECT * FROM bot_messages WHERE delete_after IS NOT NULL AND delete_after < ?`,
        [now]
      );

      for (const msg of messages) {
        try {
          const channel = await this.client.channels.fetch(msg.channel_id);
          if (channel) {
            const message = await channel.messages.fetch(msg.message_id).catch(() => null);
            if (message) {
              await message.delete();
              logger.info(`Deleted message: ${msg.message_id}`);
            }
          }
        } catch (error) {
          logger.warn(`Failed to delete message ${msg.message_id}: ${error.message}`);
        }

        // Remove from database
        await db.run(`DELETE FROM bot_messages WHERE message_id = ?`, [msg.message_id]);
      }

      // Clean up orphaned records
      await this.cleanupOrphanedChannels();
    } catch (error) {
      logger.error(`Cleanup error: ${error.message}`);
    }
  }

  async cleanupOrphanedChannels() {
    try {
      const orders = await db.all(`SELECT ticket_channel_id FROM orders WHERE status = 'completed'`);

      for (const order of orders) {
        if (!order.ticket_channel_id) continue;

        try {
          const channel = await this.client.channels.fetch(order.ticket_channel_id).catch(() => null);
          if (!channel) {
            // Channel deleted, clean up
            await db.run(`UPDATE orders SET ticket_channel_id = NULL WHERE ticket_channel_id = ?`, [order.ticket_channel_id]);
            logger.info(`Cleaned up orphaned channel: ${order.ticket_channel_id}`);
          }
        } catch (error) {
          logger.warn(`Error checking channel ${order.ticket_channel_id}: ${error.message}`);
        }
      }
    } catch (error) {
      logger.error(`Cleanup orphaned channels error: ${error.message}`);
    }
  }

  async scheduleChannelDeletion(channelId, delayMs = 24 * 60 * 60 * 1000) {
    try {
      setTimeout(async () => {
        try {
          const channel = await this.client.channels.fetch(channelId).catch(() => null);
          if (channel) {
            await channel.delete('Order completed - cleanup');
            logger.info(`Deleted ticket channel: ${channelId}`);
          }
        } catch (error) {
          logger.error(`Failed to delete channel ${channelId}: ${error.message}`);
        }
      }, delayMs);
    } catch (error) {
      logger.error(`Schedule deletion error: ${error.message}`);
    }
  }

  async recordMessage(messageId, channelId, type, deleteAfterMs = null) {
    try {
      const deleteAfter = deleteAfterMs ? Math.floor((Date.now() + deleteAfterMs) / 1000) : null;
      await db.run(
        `INSERT INTO bot_messages (message_id, channel_id, type, delete_after) VALUES (?, ?, ?, ?)`,
        [messageId, channelId, type, deleteAfter]
      );
    } catch (error) {
      logger.error(`Record message error: ${error.message}`);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      logger.info('Message cleanup service stopped');
    }
  }
}

export default MessageCleanup;
