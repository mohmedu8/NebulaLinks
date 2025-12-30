import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import db from '../models/database.js';
import AuthMiddleware from '../middleware/auth.js';
import logger from '../utils/logger.js';

export const userCreate = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands')
    .addSubcommand(sub =>
      sub.setName('user-create')
        .setDescription('Create a user directly')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord ID').setRequired(true))
        .addStringOption(opt => opt.setName('plan_name').setDescription('Plan name').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration_days').setDescription('Duration in days').setRequired(true))
        .addIntegerOption(opt => opt.setName('traffic_gb').setDescription('Traffic in GB').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('user-disable')
        .setDescription('Disable a user')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('user-enable')
        .setDescription('Enable a user')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('user-edit-traffic')
        .setDescription('Edit user traffic limit')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord ID').setRequired(true))
        .addIntegerOption(opt => opt.setName('new_traffic_gb').setDescription('New traffic limit in GB').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('user-info')
        .setDescription('Get user information')
        .addStringOption(opt => opt.setName('discord_id').setDescription('Discord ID').setRequired(true))
    ),

  async execute(interaction) {
    const adminId = interaction.user.id;

    // Check authorization
    if (!AuthMiddleware.isAdmin(adminId)) {
      return interaction.reply({
        content: '❌ You do not have permission to use admin commands.',
        ephemeral: true
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const discordId = interaction.options.getString('discord_id');

    if (subcommand === 'user-create') {
      await handleUserCreate(interaction, adminId, discordId);
    } else if (subcommand === 'user-disable') {
      await handleUserDisable(interaction, adminId, discordId);
    } else if (subcommand === 'user-enable') {
      await handleUserEnable(interaction, adminId, discordId);
    } else if (subcommand === 'user-edit-traffic') {
      await handleUserEditTraffic(interaction, adminId, discordId);
    } else if (subcommand === 'user-info') {
      await handleUserInfo(interaction, adminId, discordId);
    }
  }
};

async function handleUserCreate(interaction, adminId, discordId) {
  try {
    const planName = interaction.options.getString('plan_name');
    const durationDays = interaction.options.getInteger('duration_days');
    const trafficGb = interaction.options.getInteger('traffic_gb');

    // Create session for confirmation
    const sessionToken = await AuthMiddleware.createAdminSession(adminId, 'create_user', {
      discordId,
      planName,
      durationDays,
      trafficGb
    });

    const embed = new EmbedBuilder()
      .setColor('#ff9900')
      .setTitle('⚠️ ADMIN ACTION CONFIRMATION')
      .setDescription('Create User')
      .addFields(
        { name: 'Discord ID', value: discordId },
        { name: 'Plan', value: planName },
        { name: 'Duration', value: `${durationDays} days` },
        { name: 'Traffic', value: `${trafficGb}GB` }
      );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });

    await AuthMiddleware.logAuditAction(adminId, 'create_user', discordId, null, {
      planName,
      durationDays,
      trafficGb
    });
  } catch (error) {
    logger.error(`User create error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

async function handleUserDisable(interaction, adminId, discordId) {
  try {
    const user = await db.get(`SELECT * FROM users WHERE discord_id = ?`, [discordId]);

    if (!user) {
      return interaction.reply({
        content: '❌ User not found.',
        ephemeral: true
      });
    }

    await db.run(`UPDATE users SET status = 'disabled' WHERE discord_id = ?`, [discordId]);
    await AuthMiddleware.logAuditAction(adminId, 'disable_user', discordId, null, {});

    await interaction.reply({
      content: `✅ User ${discordId} has been disabled.`,
      ephemeral: true
    });
  } catch (error) {
    logger.error(`User disable error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

async function handleUserEnable(interaction, adminId, discordId) {
  try {
    const user = await db.get(`SELECT * FROM users WHERE discord_id = ?`, [discordId]);

    if (!user) {
      return interaction.reply({
        content: '❌ User not found.',
        ephemeral: true
      });
    }

    await db.run(`UPDATE users SET status = 'active' WHERE discord_id = ?`, [discordId]);
    await AuthMiddleware.logAuditAction(adminId, 'enable_user', discordId, null, {});

    await interaction.reply({
      content: `✅ User ${discordId} has been enabled.`,
      ephemeral: true
    });
  } catch (error) {
    logger.error(`User enable error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

async function handleUserEditTraffic(interaction, adminId, discordId) {
  try {
    const newTrafficGb = interaction.options.getInteger('new_traffic_gb');
    const user = await db.get(`SELECT * FROM users WHERE discord_id = ?`, [discordId]);

    if (!user) {
      return interaction.reply({
        content: '❌ User not found.',
        ephemeral: true
      });
    }

    await db.run(`UPDATE users SET traffic_limit_gb = ? WHERE discord_id = ?`, [newTrafficGb, discordId]);
    await AuthMiddleware.logAuditAction(adminId, 'edit_traffic', discordId, null, { newTrafficGb });

    await interaction.reply({
      content: `✅ User ${discordId} traffic limit updated to ${newTrafficGb}GB.`,
      ephemeral: true
    });
  } catch (error) {
    logger.error(`User edit traffic error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}

async function handleUserInfo(interaction, adminId, discordId) {
  try {
    const user = await db.get(`SELECT * FROM users WHERE discord_id = ?`, [discordId]);

    if (!user) {
      return interaction.reply({
        content: '❌ User not found.',
        ephemeral: true
      });
    }

    const orders = await db.all(`SELECT * FROM orders WHERE discord_id = ? ORDER BY created_at DESC LIMIT 5`, [discordId]);

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('👤 User Information')
      .addFields(
        { name: 'Discord ID', value: discordId },
        { name: 'Status', value: user.status },
        { name: 'Traffic Limit', value: `${user.traffic_limit_gb}GB` },
        { name: 'Traffic Used', value: `${user.traffic_used_gb}GB` },
        { name: 'Expiry Date', value: user.expiry_date ? new Date(user.expiry_date * 1000).toISOString() : 'N/A' },
        { name: 'Recent Orders', value: orders.length > 0 ? orders.map(o => `${o.order_id}: ${o.status}`).join('\n') : 'None' }
      );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  } catch (error) {
    logger.error(`User info error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      ephemeral: true
    });
  }
}
