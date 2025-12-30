import { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import db from '../models/database.js';
import AuthMiddleware from '../middleware/auth.js';
import RevenueService from '../services/revenue_service.js';
import logger from '../utils/logger.js';

export async function initializeDashboard(client) {
  try {
    const dashboardChannelId = process.env.BILLING_DASHBOARD_CHANNEL_ID;
    const channel = await client.channels.fetch(dashboardChannelId);

    // Check if dashboard message exists
    let messageId = await db.get(`SELECT value FROM bot_config WHERE key = 'dashboard_message_id'`);

    if (messageId) {
      try {
        const message = await channel.messages.fetch(messageId.value);
        logger.info('Dashboard message found, will update it');
        return message;
      } catch (error) {
        logger.warn('Dashboard message not found, creating new one');
      }
    }

    // Create new dashboard message
    const message = await channel.send({ content: 'Initializing dashboard...' });

    await db.run(
      `INSERT OR REPLACE INTO bot_config (key, value) VALUES ('dashboard_message_id', ?)`,
      [message.id]
    );

    logger.info('Dashboard message created');
    return message;
  } catch (error) {
    logger.error(`Initialize dashboard error: ${error.message}`);
  }
}

export async function updateDashboard(client) {
  try {
    const dashboardChannelId = process.env.BILLING_DASHBOARD_CHANNEL_ID;
    const channel = await client.channels.fetch(dashboardChannelId);

    const messageIdRecord = await db.get(`SELECT value FROM bot_config WHERE key = 'dashboard_message_id'`);
    if (!messageIdRecord) {
      logger.warn('Dashboard message ID not found');
      return;
    }

    const message = await channel.messages.fetch(messageIdRecord.value);
    const data = await RevenueService.getDashboardData();

    if (!data) {
      logger.error('Failed to get dashboard data');
      return;
    }

    const approvalRate = data.total.orders > 0
      ? Math.round((data.total.approved / data.total.orders) * 100)
      : 0;

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('💰 Revenue Dashboard')
      .setDescription(`Last Updated: ${new Date().toISOString()}`)
      .addFields(
        {
          name: '📊 Financial Overview',
          value: `Today: ${data.today.revenue} EGP (${data.today.orders} orders)\nThis Month: ${data.month.revenue} EGP (${data.month.orders} orders)\nThis Quarter: ${data.quarter.revenue} EGP (${data.quarter.orders} orders)\nThis Year: ${data.year.revenue} EGP (${data.year.orders} orders)`,
          inline: false
        },
        {
          name: '📈 Order Statistics',
          value: `Total Orders: ${data.total.orders}\n✅ Approved: ${data.total.approved} (${approvalRate}%)\n❌ Declined: ${data.total.declined}`,
          inline: false
        }
      );

    const refreshBtn = new ButtonBuilder()
      .setCustomId('dashboard_refresh')
      .setLabel('🔄 Refresh')
      .setStyle(ButtonStyle.Primary);

    const exportBtn = new ButtonBuilder()
      .setCustomId('dashboard_export')
      .setLabel('📊 Export CSV')
      .setStyle(ButtonStyle.Secondary);

    const backupBtn = new ButtonBuilder()
      .setCustomId('dashboard_backup')
      .setLabel('📁 DB Backup')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(refreshBtn, exportBtn, backupBtn);

    await message.edit({
      embeds: [embed],
      components: [row]
    });

    logger.info('Dashboard updated');
  } catch (error) {
    logger.error(`Update dashboard error: ${error.message}`);
  }
}

export async function handleDashboardRefresh(interaction) {
  try {
    if (!AuthMiddleware.isOwner(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Only owners can refresh the dashboard.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    await RevenueService.updateRevenueCache();
    await updateDashboard(interaction.client);

    await interaction.editReply({
      content: '✅ Dashboard refreshed'
    });
  } catch (error) {
    logger.error(`Dashboard refresh error: ${error.message}`);
    await interaction.editReply({
      content: '❌ An error occurred.'
    });
  }
}

export async function handleDashboardExport(interaction) {
  try {
    if (!AuthMiddleware.isOwner(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Only owners can export data.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // Get last 30 days of data
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

    const orders = await db.all(
      `SELECT o.*, p.payment_method, p.review_status FROM orders o
       LEFT JOIN payments p ON o.order_id = p.order_id
       WHERE o.created_at >= ? ORDER BY o.created_at DESC`,
      [thirtyDaysAgo]
    );

    // Generate CSV
    let csv = 'Order ID,Discord ID,Plan,Duration,Traffic,Price,Payment Method,Status,Created\n';
    orders.forEach(order => {
      csv += `"${order.order_id}","${order.discord_id}","${order.plan_name}",${order.plan_duration_days},${order.plan_traffic_gb},${order.plan_price},"${order.payment_method}","${order.review_status}","${new Date(order.created_at * 1000).toISOString()}"\n`;
    });

    const buffer = Buffer.from(csv);
    const attachment = {
      attachment: buffer,
      name: `revenue_export_${Date.now()}.csv`
    };

    await interaction.editReply({
      content: '📊 Revenue export (last 30 days)',
      files: [attachment]
    });

    logger.info('Dashboard export generated');
  } catch (error) {
    logger.error(`Dashboard export error: ${error.message}`);
    await interaction.editReply({
      content: '❌ An error occurred.'
    });
  }
}

export async function handleDashboardBackup(interaction) {
  try {
    if (!AuthMiddleware.isOwner(interaction.user.id)) {
      return interaction.reply({
        content: '❌ Only owners can backup the database.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    // For SQLite, we would copy the database file
    // This is a placeholder - actual implementation depends on your setup
    await interaction.editReply({
      content: '📁 Database backup feature coming soon.'
    });

    await AuthMiddleware.logAuditAction(interaction.user.id, 'export_data', null, null, { type: 'backup' });
  } catch (error) {
    logger.error(`Dashboard backup error: ${error.message}`);
    await interaction.editReply({
      content: '❌ An error occurred.'
    });
  }
}
