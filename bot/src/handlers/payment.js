import crypto from 'crypto';
import db from '../models/database.js';
import logger from '../utils/logger.js';

export async function handleScreenshotUpload(interaction, orderId) {
  try {
    const attachment = interaction.attachments.first();

    if (!attachment) {
      return interaction.reply({
        content: '❌ Please upload an image file.',
        ephemeral: true
      });
    }

    // Validate image type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(attachment.contentType)) {
      return interaction.reply({
        content: '❌ Only PNG and JPG images are accepted.',
        ephemeral: true
      });
    }

    // Download and hash image
    const response = await fetch(attachment.url);
    const buffer = await response.buffer();
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Check for duplicate
    const duplicate = await db.get(
      `SELECT * FROM payments WHERE screenshot_hash = ? AND review_status = 'approved'`,
      [hash]
    );

    if (duplicate) {
      return interaction.reply({
        content: '❌ This screenshot has already been used.',
        ephemeral: true
      });
    }

    // Store payment record
    await db.run(
      `INSERT INTO payments (order_id, payment_method, amount, screenshot_url, screenshot_hash, submitted_at)
       SELECT ?, payment_method, plan_price, ?, ?, strftime('%s', 'now')
       FROM orders WHERE order_id = ?`,
      [orderId, attachment.url, hash, orderId]
    );

    // Update order status
    await db.run(
      `UPDATE orders SET status = 'payment_submitted' WHERE order_id = ?`,
      [orderId]
    );

    // Lock channel
    const channel = interaction.channel;
    await channel.permissionOverwrites.edit(interaction.user.id, { SendMessages: false });

    await interaction.reply({
      content: '✅ Payment screenshot received. Waiting for admin review.',
      ephemeral: true
    });

    logger.info(`Payment submitted for order ${orderId}`);
  } catch (error) {
    logger.error(`Screenshot upload error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred while processing your screenshot.',
      ephemeral: true
    });
  }
}

export async function validateScreenshot(attachment) {
  try {
    if (!attachment) return false;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    return validTypes.includes(attachment.contentType);
  } catch (error) {
    logger.error(`Validate screenshot error: ${error.message}`);
    return false;
  }
}
