import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../services/database.js';
import { logger } from '../utils/logger.js';

export const setupCommand = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('Admin commands')
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Initialize bot panels')
  )
  .addSubcommand(sub =>
    sub.setName('plan')
      .setDescription('Manage plans')
      .addStringOption(opt =>
        opt.setName('action')
          .setDescription('Action to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Create', value: 'create' },
            { name: 'List', value: 'list' }
          )
      )
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Plan name')
          .setRequired(false)
      )
      .addIntegerOption(opt =>
        opt.setName('duration')
          .setDescription('Duration in days')
          .setRequired(false)
      )
      .addIntegerOption(opt =>
        opt.setName('traffic')
          .setDescription('Traffic in GB')
          .setRequired(false)
      )
      .addNumberOption(opt =>
        opt.setName('price')
          .setDescription('Price in EGP')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('server')
      .setDescription('Manage servers')
      .addStringOption(opt =>
        opt.setName('action')
          .setDescription('Action to perform')
          .setRequired(true)
          .addChoices(
            { name: 'Add', value: 'add' },
            { name: 'List', value: 'list' }
          )
      )
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Server name')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt.setName('endpoint')
          .setDescription('API endpoint')
          .setRequired(false)
      )
      .addIntegerOption(opt =>
        opt.setName('inbound')
          .setDescription('Inbound ID')
          .setRequired(false)
      )
      .addIntegerOption(opt =>
        opt.setName('capacity')
          .setDescription('Server capacity')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub.setName('stats')
      .setDescription('View statistics')
  );

export async function handleAdminCommand(interaction) {
  try {
    // Verify admin role
    if (!interaction.member.roles.cache.has(process.env.ADMIN_ROLE_ID)) {
      return interaction.reply({ content: '❌ You do not have permission', ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      await handleSetup(interaction);
    } else if (subcommand === 'plan') {
      await handlePlanCommand(interaction);
    } else if (subcommand === 'server') {
      await handleServerCommand(interaction);
    } else if (subcommand === 'stats') {
      await handleStatsCommand(interaction);
    }
  } catch (error) {
    logger.error('Error in admin command', { message: error.message });
    await interaction.reply({ content: '❌ An error occurred', ephemeral: true }).catch(() => {});
  }
}

async function handleSetup(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const panelService = (await import('../services/panelService.js')).default;

    if (process.env.MAIN_PANEL_CHANNEL_ID) {
      await panelService.initializeMainPanel(interaction.client, process.env.MAIN_PANEL_CHANNEL_ID);
    }

    if (process.env.BILLING_CHANNEL_ID) {
      await panelService.initializeStatsPanel(interaction.client, process.env.BILLING_CHANNEL_ID);
    }

    await interaction.editReply('✅ Panels initialized successfully');
    logger.info('Admin setup completed', { userId: interaction.user.id });
  } catch (error) {
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

async function handlePlanCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const action = interaction.options.getString('action');

  if (action === 'create') {
    const name = interaction.options.getString('name');
    const duration = interaction.options.getInteger('duration');
    const traffic = interaction.options.getInteger('traffic');
    const price = interaction.options.getNumber('price');

    if (!name || !duration || !traffic || !price) {
      return interaction.editReply('❌ Missing required fields');
    }

    try {
      const stmt = db.db.prepare(`
        INSERT INTO plans (name, duration_days, traffic_gb, price_egp, is_active)
        VALUES (?, ?, ?, ?, 1)
      `);
      stmt.run(name, duration, traffic, price);

      await interaction.editReply(`✅ Plan created: ${name}`);
      logger.info('Plan created', { name, duration, traffic, price });
    } catch (error) {
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  } else if (action === 'list') {
    const plans = db.getActivePlans();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📦 Active Plans')
      .setTimestamp();

    plans.forEach(plan => {
      embed.addFields({
        name: plan.name,
        value: `${plan.duration_days} days • ${plan.traffic_gb}GB • ${plan.price_egp} EGP`,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleServerCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const action = interaction.options.getString('action');

  if (action === 'add') {
    const name = interaction.options.getString('name');
    const endpoint = interaction.options.getString('endpoint');
    const inbound = interaction.options.getInteger('inbound');
    const capacity = interaction.options.getInteger('capacity');

    if (!name || !endpoint || !inbound || !capacity) {
      return interaction.editReply('❌ Missing required fields');
    }

    try {
      db.addServer(name, endpoint, inbound, capacity);
      await interaction.editReply(`✅ Server added: ${name}`);
      logger.info('Server added', { name, inbound, capacity });
    } catch (error) {
      await interaction.editReply(`❌ Error: ${error.message}`);
    }
  } else if (action === 'list') {
    const servers = db.getActiveServers();

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🌐 Servers')
      .setTimestamp();

    servers.forEach(server => {
      const loadPercent = ((server.current_load / server.capacity) * 100).toFixed(1);
      embed.addFields({
        name: server.name,
        value: `Load: ${server.current_load}/${server.capacity} (${loadPercent}%) • Status: ${server.status}`,
        inline: false
      });
    });

    await interaction.editReply({ embeds: [embed] });
  }
}

async function handleStatsCommand(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const today = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const dailyRevenue = db.getDailyRevenue(today);
    const monthlyRevenue = db.getMonthlyRevenue(year, month);
    const activeUsers = db.getActiveUserCount();

    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('📊 Statistics')
      .addFields(
        { name: '💰 Today\'s Revenue', value: `${dailyRevenue} EGP`, inline: true },
        { name: '📅 Monthly Revenue', value: `${monthlyRevenue} EGP`, inline: true },
        { name: '👥 Active Users', value: activeUsers.toString(), inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}
