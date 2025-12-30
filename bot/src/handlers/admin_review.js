import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/database.js';
import AuthMiddleware from '../middleware/auth.js';
import RevenueService from '../services/revenue_service.js';
import logger from '../utils/logger.js';

export async function sendPaymentReview(client, payment, order, user) {
  try {
    const adminChannel = await client.channels.fetch(process.env.ADMIN_REVIEW_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setColor('#ffa500')
      .setTitle('📋 New Payment Submission')
      .addFields(
        { name: 'Order ID', value: order.order_id },
        { name: 'User', value: `${user.username} (${order.discord_id})` },
        { name: 'Plan', value: `${order.plan_name} - ${order.plan_duration_days} days - ${order.plan_traffic_gb}GB` },
        { name: 'Amount', value: `${order.plan_price} EGP` },
        { name: 'Payment Method', value: payment.payment_method },
        { name: 'Submitted', value: new Date(payment.submitted_at * 1000).toISOString() }
      );

    if (payment.screenshot_url) {
      embed.setImage(payment.screenshot_url);
    }

    const approveBtn = new ButtonBuilder()
      .setCustomId(`approve_payment_${order.order_id}`)
      .setLabel('✅ Approve')
      .setStyle(ButtonStyle.Success);

    const declineBtn = new ButtonBuilder()
      .setCustomId(`decline_payment_${order.order_id}`)
      .setLabel('❌ Decline')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(approveBtn, declineBtn);

    const message = await adminChannel.send({
      embeds: [embed],
      components: [row]
    });

    logger.info(`Payment review sent for order ${order.order_id}`);
    return message;
  } catch (error) {
    logger.error(`Send payment review error: ${error.message}`);
  }
}

export async function handleApproveButton(interaction, xrayClient, client) {
  try {
    const adminId = interaction.user.id;

    // Check authorization
    if (!AuthMiddleware.isAdmin(adminId)) {
      return interaction.reply({
        content: '❌ You do not have permission.',
        ephemeral: true
      });
    }

    const orderId = interaction.customId.replace('approve_payment_', '');

    // Create session
    const sessionToken = await AuthMiddleware.createAdminSession(adminId, 'approve_payment', { orderId });

    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('⚠️ ADMIN ACTION CONFIRMATION')
      .setDescription('Approve Payment')
      .addFields({ name: 'Order ID', value: orderId });

    const confirmBtn = new ButtonBuilder()
      .setCustomId(`confirm_approve_${sessionToken}`)
      .setLabel('✅ Confirm')
      .setStyle(ButtonStyle.Success);

    const cancelBtn = new ButtonBuilder()
      .setCustomId('cancel_action')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  } catch (error) {
    logger.error(`Approve button error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

export async function handleConfirmApprove(interaction, xrayClient, client) {
  try {
    const adminId = interaction.user.id;
    const sessionToken = interaction.customId.replace('confirm_approve_', '');

    // Validate session
    const session = await AuthMiddleware.validateSession(sessionToken, adminId);
    if (!session) {
      return interaction.reply({
        content: '❌ Session expired or invalid.',
        ephemeral: true
      });
    }

    const payload = JSON.parse(session.action_payload);
    const orderId = payload.orderId;

    // Consume session
    await AuthMiddleware.consumeSession(sessionToken);

    // Get order and payment
    const order = await db.get(`SELECT * FROM orders WHERE order_id = ?`, [orderId]);
    const payment = await db.get(`SELECT * FROM payments WHERE order_id = ?`, [orderId]);

    if (!order || !payment) {
      return interaction.reply({
        content: '❌ Order or payment not found.',
        ephemeral: true
      });
    }

    // Check 3x-ui health
    if (!xrayClient.healthy) {
      return interaction.reply({
        content: '❌ 3x-ui panel is currently unavailable. Please try again later.',
        ephemeral: true
      });
    }

    // Execute approval workflow
    await executeApproval(interaction, order, payment, xrayClient, client, adminId);
  } catch (error) {
    logger.error(`Confirm approve error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

export async function executeApproval(interaction, order, payment, xrayClient, client, adminId) {
  try {
    const uuid = uuidv4();
    const expiryTimestamp = Math.floor((Date.now() + order.plan_duration_days * 24 * 60 * 60 * 1000) / 1000);
    const trafficBytes = order.plan_traffic_gb * (1024 ** 3);
    const email = `user_${order.discord_id}_${order.order_id}`;

    // Create client in 3x-ui
    const clientResult = await xrayClient.createClient(
      process.env.DEFAULT_INBOUND_ID,
      email,
      uuid,
      expiryTimestamp,
      trafficBytes
    );

    if (!clientResult) {
      throw new Error('Failed to create client in 3x-ui');
    }

    // Generate VLESS link
    const vlessLink = xrayClient.generateVLESSLink(uuid, 'your-server.com', 443);

    // Update database
    await db.run(
      `INSERT OR REPLACE INTO users (discord_id, xray_uuid, xray_email, status, expiry_date, traffic_limit_gb, inbound_id)
       VALUES (?, ?, ?, 'active', ?, ?, ?)`,
      [order.discord_id, uuid, email, expiryTimestamp, order.plan_traffic_gb, process.env.DEFAULT_INBOUND_ID]
    );

    await db.run(
      `UPDATE orders SET status = 'completed' WHERE order_id = ?`,
      [order.order_id]
    );

    await db.run(
      `UPDATE payments SET review_status = 'approved', reviewed_by = ?, reviewed_at = strftime('%s', 'now') WHERE order_id = ?`,
      [adminId, order.order_id]
    );

    // Update revenue cache
    await RevenueService.updateRevenueCache();

    // Send VLESS link to user
    try {
      const user = await client.users.fetch(order.discord_id);
      const linkEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Payment Approved!')
        .setDescription('Your VPN access is ready.')
        .addFields(
          { name: 'Connection Link', value: `\`\`\`${vlessLink}\`\`\`` },
          { name: 'Expires', value: new Date(expiryTimestamp * 1000).toISOString() },
          { name: 'Traffic Limit', value: `${order.plan_traffic_gb}GB` }
        );

      await user.send({ embeds: [linkEmbed] });
    } catch (error) {
      logger.warn(`Failed to send DM to user: ${error.message}`);
    }

    // Log audit
    await AuthMiddleware.logAuditAction(adminId, 'approve_payment', order.discord_id, order.order_id, {
      amount: order.plan_price,
      method: payment.payment_method
    });

    await interaction.reply({
      content: `✅ Payment approved for order ${order.order_id}. VLESS link sent to user.`,
      ephemeral: true
    });

    logger.info(`Payment approved for order ${order.order_id}`);
  } catch (error) {
    logger.error(`Approval execution error: ${error.message}`);
    await interaction.reply({
      content: `❌ Approval failed: ${error.message}`,
      ephemeral: true
    });
  }
}

export async function handleDeclineButton(interaction) {
  try {
    const adminId = interaction.user.id;

    if (!AuthMiddleware.isAdmin(adminId)) {
      return interaction.reply({
        content: '❌ You do not have permission.',
        ephemeral: true
      });
    }

    const orderId = interaction.customId.replace('decline_payment_', '');

    // Create session
    const sessionToken = await AuthMiddleware.createAdminSession(adminId, 'decline_payment', { orderId });

    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('⚠️ ADMIN ACTION CONFIRMATION')
      .setDescription('Decline Payment')
      .addFields({ name: 'Order ID', value: orderId });

    const confirmBtn = new ButtonBuilder()
      .setCustomId(`confirm_decline_${sessionToken}`)
      .setLabel('✅ Confirm')
      .setStyle(ButtonStyle.Success);

    const cancelBtn = new ButtonBuilder()
      .setCustomId('cancel_action')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  } catch (error) {
    logger.error(`Decline button error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

export async function handleConfirmDecline(interaction, client) {
  try {
    const adminId = interaction.user.id;
    const sessionToken = interaction.customId.replace('confirm_decline_', '');

    // Validate session
    const session = await AuthMiddleware.validateSession(sessionToken, adminId);
    if (!session) {
      return interaction.reply({
        content: '❌ Session expired or invalid.',
        ephemeral: true
      });
    }

    const payload = JSON.parse(session.action_payload);
    const orderId = payload.orderId;

    // Consume session
    await AuthMiddleware.consumeSession(sessionToken);

    // Get order
    const order = await db.get(`SELECT * FROM orders WHERE order_id = ?`, [orderId]);
    if (!order) {
      return interaction.reply({
        content: '❌ Order not found.',
        ephemeral: true
      });
    }

    // Update payment and order
    await db.run(
      `UPDATE payments SET review_status = 'declined', reviewed_by = ?, reviewed_at = strftime('%s', 'now') WHERE order_id = ?`,
      [adminId, orderId]
    );

    await db.run(
      `UPDATE orders SET status = 'declined' WHERE order_id = ?`,
      [orderId]
    );

    // Unlock ticket channel
    if (order.ticket_channel_id) {
      try {
        const channel = await client.channels.fetch(order.ticket_channel_id);
        await channel.permissionOverwrites.edit(order.discord_id, { SendMessages: true });

        const embed = new EmbedBuilder()
          .setColor('#ff0000')
          .setTitle('❌ Payment Declined')
          .setDescription('Your payment was declined. Please resubmit with a valid screenshot.');

        await channel.send({ embeds: [embed] });
      } catch (error) {
        logger.warn(`Failed to unlock channel: ${error.message}`);
      }
    }

    // Log audit
    await AuthMiddleware.logAuditAction(adminId, 'decline_payment', order.discord_id, orderId, {});

    await interaction.reply({
      content: `✅ Payment declined for order ${orderId}.`,
      ephemeral: true
    });

    logger.info(`Payment declined for order ${orderId}`);
  } catch (error) {
    logger.error(`Confirm decline error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}
