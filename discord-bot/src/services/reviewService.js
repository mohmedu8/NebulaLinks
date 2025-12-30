import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from './database.js';
import { logger } from '../utils/logger.js';

class ReviewService {
  async sendReviewRequest(client, orderId, reviewChannelId) {
    try {
      const order = db.getOrderById(orderId);
      if (!order) {
        logger.error('Order not found', { orderId });
        return;
      }

      const user = db.getUserByDiscordId(order.user_id);
      const plan = db.getPlanById(order.plan_id);

      const channel = await client.channels.fetch(reviewChannelId);
      if (!channel) {
        logger.error('Review channel not found', { reviewChannelId });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#ffaa00')
        .setTitle('📋 New Order Review Required')
        .addFields(
          { name: 'Order ID', value: order.order_id, inline: true },
          { name: 'User', value: `<@${user.discord_id}>`, inline: true },
          { name: 'Plan', value: `${order.duration_days} days - ${order.traffic_gb}GB`, inline: true },
          { name: 'Price', value: `${order.price_egp} EGP`, inline: true },
          { name: 'Payment Method', value: order.payment_method, inline: true },
          { name: 'Status', value: order.status, inline: true },
          { name: 'Screenshot', value: order.screenshot_url ? '[View]('+order.screenshot_url+')' : 'No screenshot', inline: false }
        )
        .setFooter({ text: 'Review this order' })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`review_approve_${orderId}`)
            .setLabel('✅ Approve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`review_decline_${orderId}`)
            .setLabel('❌ Decline')
            .setStyle(ButtonStyle.Danger)
        );

      const message = await channel.send({ embeds: [embed], components: [row] });
      logger.info('Review request sent', { orderId, messageId: message.id });
      return message;
    } catch (error) {
      logger.error('Error sending review request', { orderId, message: error.message });
    }
  }

  async sendOrderConfirmation(client, orderId, orderChannelId, configDetails) {
    try {
      const channel = await client.channels.fetch(orderChannelId);
      if (!channel) {
        logger.error('Order channel not found', { orderChannelId });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Order Approved!')
        .addFields(
          { name: 'UUID', value: `\`${configDetails.uuid}\``, inline: false },
          { name: 'Expiry Date', value: new Date(configDetails.expiry * 1000).toISOString(), inline: true },
          { name: 'Traffic Limit', value: `${configDetails.trafficLimit}GB`, inline: true },
          { name: 'Server', value: configDetails.server || 'Default', inline: true }
        )
        .setDescription('Your VPN account is now active! Use the VLESS link below to connect.')
        .setFooter({ text: 'Keep your credentials safe' })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      // Send VLESS link as spoiler
      if (configDetails.vlessLink) {
        await channel.send(`**VLESS Link:**\n||${configDetails.vlessLink}||`);
      }

      logger.info('Order confirmation sent', { orderId });
    } catch (error) {
      logger.error('Error sending order confirmation', { orderId, message: error.message });
    }
  }

  async sendDeclineNotification(client, orderId, orderChannelId, reason) {
    try {
      const channel = await client.channels.fetch(orderChannelId);
      if (!channel) {
        logger.error('Order channel not found', { orderChannelId });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ Order Declined')
        .addFields(
          { name: 'Reason', value: reason || 'No reason provided', inline: false }
        )
        .setDescription('Your order has been declined. Please contact support for more information.')
        .setTimestamp();

      await channel.send({ embeds: [embed] });
      logger.info('Decline notification sent', { orderId });
    } catch (error) {
      logger.error('Error sending decline notification', { orderId, message: error.message });
    }
  }
}

export default new ReviewService();
