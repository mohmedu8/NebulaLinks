import { EmbedBuilder } from 'discord.js';
import db from '../../services/database.js';
import apiClient from '../../services/apiClient.js';
import reviewService from '../../services/reviewService.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function handleReviewApprove(interaction) {
  try {
    await interaction.deferUpdate();

    // Verify admin role
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.followUp({ content: '❌ You do not have permission to approve orders', ephemeral: true });
    }

    const orderId = interaction.customId.split('_')[2];
    const order = db.getOrderById(orderId);

    if (!order) {
      return interaction.followUp({ content: '❌ Order not found', ephemeral: true });
    }

    if (order.status !== 'WAITING_REVIEW') {
      return interaction.followUp({ content: '❌ Order is not pending review', ephemeral: true });
    }

    // Select least loaded server
    const server = db.selectLeastLoadedServer();
    if (!server) {
      return interaction.followUp({ content: '❌ No available servers', ephemeral: true });
    }

    // Generate UUID and create VPN account
    const uuid = uuidv4();
    const email = `user_${order.user_id}_${Date.now()}@nebulalinks.local`;
    const expiryTime = Math.floor(Date.now() / 1000) + (order.duration_days * 24 * 60 * 60);

    try {
      const result = await apiClient.createVPNAccount(
        order.user_id,
        order.duration_days,
        order.traffic_gb,
        server.id,
        server.inbound_id,
        email,
        uuid
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to create VPN account');
      }

      // Create VPN account record
      db.createVPNAccount(order.user_id, server.id, uuid, '', expiryTime, order.traffic_gb);

      // Update order status
      db.approveOrder(orderId, interaction.user.id);

      // Update server load
      db.updateServerLoad(server.id, 1);

      // Create audit log
      db.createAuditLog('ORDER_APPROVED', interaction.user.id, orderId, {
        serverId: server.id,
        uuid,
        email
      });

      // Send confirmation to order channel
      const orderChannel = await interaction.client.channels.fetch(order.channel_id);
      if (orderChannel) {
        await reviewService.sendOrderConfirmation(interaction.client, orderId, order.channel_id, {
          uuid,
          expiry: expiryTime,
          trafficLimit: order.traffic_gb,
          server: server.name,
          vlessLink: result.vlessLink || ''
        });
      }

      // Update review message
      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Order Approved')
        .setDescription(`Order ${order.order_id} has been approved by ${interaction.user.username}`)
        .setTimestamp();

      await interaction.message.edit({ embeds: [embed], components: [] });

      logger.info('Order approved', { orderId, approvedBy: interaction.user.id });
      await interaction.followUp({ content: '✅ Order approved successfully', ephemeral: true });
    } catch (error) {
      logger.error('Error creating VPN account', { orderId, message: error.message });
      await interaction.followUp({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
  } catch (error) {
    logger.error('Error in review approve handler', { message: error.message });
    await interaction.followUp({ content: '❌ An error occurred', ephemeral: true }).catch(() => {});
  }
}
