import { EmbedBuilder } from 'discord.js';
import db from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export async function handleBillingExportCSV(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    // Verify admin role
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.editReply({ content: '❌ You do not have permission' });
    }

    const stmt = db.db.prepare(`
      SELECT o.order_id, o.created_at, u.discord_username, o.duration_days, o.traffic_gb, 
             o.price_egp, o.payment_method, o.status, o.reviewed_by
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    const orders = stmt.all();

    let csv = 'Order ID,Date,User,Duration (days),Traffic (GB),Price (EGP),Payment Method,Status,Reviewed By\n';
    orders.forEach(order => {
      csv += `"${order.order_id}","${order.created_at}","${order.discord_username}",${order.duration_days},${order.traffic_gb},${order.price_egp},"${order.payment_method}","${order.status}","${order.reviewed_by || 'N/A'}"\n`;
    });

    const buffer = Buffer.from(csv, 'utf-8');
    const attachment = {
      attachment: buffer,
      name: `orders_${new Date().toISOString().split('T')[0]}.csv`
    };

    await interaction.editReply({
      content: `✅ Exported ${orders.length} orders`,
      files: [attachment]
    });

    logger.info('CSV export generated', { userId: interaction.user.id, count: orders.length });
  } catch (error) {
    logger.error('Error exporting CSV', { message: error.message });
    await interaction.editReply({ content: '❌ An error occurred' }).catch(() => {});
  }
}

export async function handleBillingExportJSON(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    // Verify admin role
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.editReply({ content: '❌ You do not have permission' });
    }

    const stmt = db.db.prepare(`
      SELECT o.*, u.discord_username, u.discord_id
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    const orders = stmt.all();

    const json = JSON.stringify(orders, null, 2);
    const buffer = Buffer.from(json, 'utf-8');
    const attachment = {
      attachment: buffer,
      name: `orders_${new Date().toISOString().split('T')[0]}.json`
    };

    await interaction.editReply({
      content: `✅ Exported ${orders.length} orders`,
      files: [attachment]
    });

    logger.info('JSON export generated', { userId: interaction.user.id, count: orders.length });
  } catch (error) {
    logger.error('Error exporting JSON', { message: error.message });
    await interaction.editReply({ content: '❌ An error occurred' }).catch(() => {});
  }
}

export async function handleBillingAuditLog(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    // Verify admin role
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.editReply({ content: '❌ You do not have permission' });
    }

    const stmt = db.db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 100
    `);
    const logs = stmt.all();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📜 Audit Log (Last 100 entries)')
      .setTimestamp();

    let description = '';
    logs.forEach((log, index) => {
      const line = `**${index + 1}.** ${log.action} - ${log.created_at}\n`;
      if ((description + line).length < 4096) {
        description += line;
      }
    });

    embed.setDescription(description || 'No audit logs');

    await interaction.editReply({ embeds: [embed] });

    logger.info('Audit log viewed', { userId: interaction.user.id, count: logs.length });
  } catch (error) {
    logger.error('Error viewing audit log', { message: error.message });
    await interaction.editReply({ content: '❌ An error occurred' }).catch(() => {});
  }
}
