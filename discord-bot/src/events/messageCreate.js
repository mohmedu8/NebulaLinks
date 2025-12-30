import db from '../services/database.js';
import reviewService from '../services/reviewService.js';
import { logger } from '../utils/logger.js';
import { PermissionFlagsBits } from 'discord.js';

export async function handleMessageCreate(message) {
  try {
    // Ignore bot messages
    if (message.author.bot) return;

    // Check if message is in an order channel
    if (!message.channel.name.startsWith('order-')) return;

    // Check if message has attachments
    if (message.attachments.size === 0) return;

    // Get order from channel ID
    const orders = db.db.prepare('SELECT * FROM orders WHERE channel_id = ?').all(message.channelId);
    if (orders.length === 0) return;

    const order = orders[0];

    // Verify sender is order owner
    const user = db.getUserByDiscordId(message.author.id);
    if (!user || user.id !== order.user_id) {
      return message.reply('❌ You are not the order owner');
    }

    // Verify order status
    if (order.status !== 'WAITING_PAYMENT') {
      return message.reply('❌ This order is not waiting for payment');
    }

    // Get first image attachment
    const attachment = message.attachments.first();
    if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
      return message.reply('❌ Please upload an image file');
    }

    // Update order with screenshot
    db.updateOrderScreenshot(order.id, attachment.url);

    // Lock channel (remove SEND_MESSAGES permission from user)
    await message.channel.permissionOverwrites.edit(message.author.id, {
      SendMessages: false
    });

    // Send confirmation
    await message.reply('✅ Screenshot received! Waiting for admin review...');

    // Forward to review channel
    const reviewChannel = await message.client.channels.fetch(process.env.REVIEW_CHANNEL_ID);
    if (reviewChannel) {
      await reviewService.sendReviewRequest(message.client, order.id, process.env.REVIEW_CHANNEL_ID);
    }

    logger.info('Screenshot uploaded', { orderId: order.id, userId: user.id });
  } catch (error) {
    logger.error('Error handling message create', { message: error.message });
  }
}
