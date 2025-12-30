import { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import db from '../../services/database.js';
import reviewService from '../../services/reviewService.js';
import { logger } from '../../utils/logger.js';

export async function handleReviewDecline(interaction) {
  try {
    // Verify admin role
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.reply({ content: '❌ You do not have permission to decline orders', ephemeral: true });
    }

    const orderId = interaction.customId.split('_')[2];
    const order = db.getOrderById(orderId);

    if (!order) {
      return interaction.reply({ content: '❌ Order not found', ephemeral: true });
    }

    // Show modal for decline reason
    const modal = new ModalBuilder()
      .setCustomId(`decline_reason_${orderId}`)
      .setTitle('Decline Order')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('decline_reason_input')
            .setLabel('Reason for declining')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(500)
        )
      );

    await interaction.showModal(modal);
    logger.info('Decline modal shown', { orderId });
  } catch (error) {
    logger.error('Error in review decline handler', { message: error.message });
    await interaction.reply({ content: '❌ An error occurred', ephemeral: true }).catch(() => {});
  }
}

export async function handleDeclineReasonSubmit(interaction) {
  try {
    const orderId = interaction.customId.split('_')[2];
    const reason = interaction.fields.getTextInputValue('decline_reason_input');

    const order = db.getOrderById(orderId);
    if (!order) {
      return interaction.reply({ content: '❌ Order not found', ephemeral: true });
    }

    // Update order status
    db.declineOrder(orderId, interaction.user.id, reason);

    // Create audit log
    db.createAuditLog('ORDER_DECLINED', interaction.user.id, orderId, {
      reason
    });

    // Send decline notification to order channel
    await reviewService.sendDeclineNotification(interaction.client, orderId, order.channel_id, reason);

    // Update review message
    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('❌ Order Declined')
      .setDescription(`Order ${order.order_id} has been declined by ${interaction.user.username}`)
      .addFields({ name: 'Reason', value: reason })
      .setTimestamp();

    // Find and update the review message
    const reviewChannel = await interaction.client.channels.fetch(process.env.REVIEW_CHANNEL_ID);
    if (reviewChannel) {
      const messages = await reviewChannel.messages.fetch({ limit: 50 });
      const reviewMessage = messages.find(m => m.embeds[0]?.title === '📋 New Order Review Required' && m.embeds[0]?.fields[0]?.value === order.order_id);
      if (reviewMessage) {
        await reviewMessage.edit({ embeds: [embed], components: [] });
      }
    }

    logger.info('Order declined', { orderId, declinedBy: interaction.user.id });
    await interaction.reply({ content: '✅ Order declined successfully', ephemeral: true });
  } catch (error) {
    logger.error('Error in decline reason submit handler', { message: error.message });
    await interaction.reply({ content: '❌ An error occurred', ephemeral: true }).catch(() => {});
  }
}
