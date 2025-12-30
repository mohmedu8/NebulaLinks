import 'dotenv/config';
import { Client, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './models/database.js';
import logger from './utils/logger.js';
import XrayClient from './services/xray_client.js';
import HealthMonitor from './services/health_monitor.js';
import MessageCleanup from './services/message_cleanup.js';
import AuthMiddleware from './middleware/auth.js';
import rateLimiter from './middleware/rate_limit.js';
import RevenueService from './services/revenue_service.js';
import { initializeDashboard, updateDashboard, handleDashboardRefresh, handleDashboardExport, handleDashboardBackup } from './handlers/dashboard.js';
import { handleApproveButton, handleConfirmApprove, handleDeclineButton, handleConfirmDecline } from './handlers/admin_review.js';
import cron from 'node-cron';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const xrayClient = new XrayClient(
  process.env.XRAY_API_URL,
  process.env.XRAY_API_USERNAME,
  process.env.XRAY_API_PASSWORD
);

const healthMonitor = new HealthMonitor(xrayClient);
const messageCleanup = new MessageCleanup(client);

const commands = new Collection();
const buttonHandlers = new Collection();

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    const commandData = command.default;

    if (commandData && commandData.data && commandData.execute) {
      commands.set(commandData.data.name, commandData);
      logger.info(`Loaded command: ${commandData.data.name}`);
    }
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = await import(`file://${filePath}`);
    const eventData = event.default;

    if (eventData.name && eventData.execute) {
      if (eventData.once) {
        client.once(eventData.name, (...args) => eventData.execute(...args, xrayClient, healthMonitor));
      } else {
        client.on(eventData.name, (...args) => {
          if (eventData.name === 'interactionCreate') {
            eventData.execute(args[0], commands, buttonHandlers);
          } else {
            eventData.execute(...args);
          }
        });
      }
      logger.info(`Loaded event: ${eventData.name}`);
    }
  }
}

// Handler functions - DEFINED BEFORE registerButtonHandlers
async function handlePlanSelect(interaction) {
  try {
    const planId = interaction.values[0];
    const plans = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/plans.json'), 'utf8'));
    const plan = plans.find(p => p.id === planId);

    if (!plan) {
      return interaction.reply({
        content: '❌ Plan not found.',
        flags: 64
      });
    }

    const guild = interaction.guild;
    const channel = await guild.channels.create({
      name: `order-${interaction.user.username}-${Date.now()}`,
      type: 0,
      permissionOverwrites: [
        {
          id: guild.id,
          deny: ['ViewChannel']
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
        },
        {
          id: client.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
        }
      ]
    });

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await db.run(
      `INSERT INTO orders (order_id, discord_id, plan_name, plan_duration_days, plan_traffic_gb, plan_price, ticket_channel_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment')`,
      [orderId, interaction.user.id, plan.name, plan.duration_days, plan.traffic_gb, plan.price, channel.id]
    );

    const { EmbedBuilder } = await import('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📦 Order Created')
      .addFields(
        { name: 'Order ID', value: orderId },
        { name: 'Plan', value: plan.name },
        { name: 'Duration', value: `${plan.duration_days} days` },
        { name: 'Traffic', value: `${plan.traffic_gb}GB` },
        { name: 'Price', value: `${plan.price} EGP` }
      );

    await channel.send({ embeds: [embed] });

    const paymentMethods = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/payment_methods.json'), 'utf8'));
    const { StringSelectMenuBuilder, ActionRowBuilder } = await import('discord.js');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('payment_method_select')
      .setPlaceholder('Select payment method')
      .addOptions(Object.entries(paymentMethods).map(([key, method]) => ({
        label: method.name,
        value: key
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await channel.send({
      content: '💳 Select your payment method:',
      components: [row]
    });

    await interaction.reply({
      content: `✅ Order created! Check <#${channel.id}>`,
      flags: 64
    });

    logger.info(`Order created: ${orderId}`);
  } catch (error) {
    logger.error(`Plan select error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      flags: 64
    });
  }
}

async function handlePaymentMethodSelect(interaction) {
  try {
    const method = interaction.values[0];
    const order = await db.get(`SELECT * FROM orders WHERE ticket_channel_id = ?`, [interaction.channel.id]);
    if (!order) {
      return interaction.reply({
        content: '❌ Order not found.',
        flags: 64
      });
    }

    await db.run(
      `INSERT OR REPLACE INTO payments (order_id, payment_method, amount, submitted_at)
       VALUES (?, ?, ?, strftime('%s', 'now'))`,
      [order.order_id, method, order.plan_price]
    );

    const paymentMethods = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/payment_methods.json'), 'utf8'));
    const methodInfo = paymentMethods[method];

    const { EmbedBuilder } = await import('discord.js');
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setTitle('💳 Payment Instructions')
      .setDescription(methodInfo.instructions.replace('{order_id}', order.order_id));

    await interaction.reply({
      embeds: [embed],
      flags: 64
    });

    await interaction.channel.send({
      content: '📸 Please upload your payment screenshot below:'
    });

    logger.info(`Payment method selected for order: ${order.order_id}`);
  } catch (error) {
    logger.error(`Payment method select error: ${error.message}`);
    await interaction.reply({
      content: '❌ An error occurred.',
      flags: 64
    });
  }
}

async function handleCancelAction(interaction) {
  await interaction.reply({
    content: '❌ Action cancelled.',
    flags: 64
  });
}

async function setupMessageCreateListener() {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const order = await db.get(`SELECT * FROM orders WHERE ticket_channel_id = ?`, [message.channel.id]);
    if (!order) return;
    
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      
      if (!validTypes.includes(attachment.contentType)) {
        return message.reply('❌ Only PNG and JPG images accepted');
      }
      
      const crypto = await import('crypto');
      const response = await fetch(attachment.url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const hash = crypto.default.createHash('sha256').update(buffer).digest('hex');
      
      const duplicate = await db.get(`SELECT * FROM payments WHERE screenshot_hash = ? AND review_status = 'approved'`, [hash]);
      if (duplicate) {
        return message.reply('❌ Screenshot already used');
      }
      
      await db.run(
        `UPDATE payments SET screenshot_url = ?, screenshot_hash = ? WHERE order_id = ?`,
        [attachment.url, hash, order.order_id]
      );
      
      await db.run(`UPDATE orders SET status = 'payment_submitted' WHERE order_id = ?`, [order.order_id]);
      
      const adminChannel = await client.channels.fetch(process.env.ADMIN_REVIEW_CHANNEL_ID);
      const { EmbedBuilder } = await import('discord.js');
      const embed = new EmbedBuilder()
        .setColor('#ffa500')
        .setTitle('📋 New Payment Submission')
        .addFields(
          { name: 'Order ID', value: order.order_id },
          { name: 'User', value: `${message.author.username} (${order.discord_id})` },
          { name: 'Plan', value: `${order.plan_name}` },
          { name: 'Amount', value: `${order.plan_price} EGP` }
        )
        .setImage(attachment.url);
      
      const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = await import('discord.js');
      const approveBtn = new ButtonBuilder()
        .setCustomId(`approve_payment_${order.order_id}`)
        .setLabel('✅ Approve')
        .setStyle(ButtonStyle.Success);
      
      const declineBtn = new ButtonBuilder()
        .setCustomId(`decline_payment_${order.order_id}`)
        .setLabel('❌ Decline')
        .setStyle(ButtonStyle.Danger);
      
      const row = new ActionRowBuilder().addComponents(approveBtn, declineBtn);
      
      await adminChannel.send({ embeds: [embed], components: [row] });
      await message.reply('✅ Screenshot received, waiting for admin review');
      logger.info(`Screenshot received for order: ${order.order_id}`);
    }
  });
}

function registerButtonHandlers() {
  buttonHandlers.set('plan_select', handlePlanSelect);
  buttonHandlers.set('payment_method_select', handlePaymentMethodSelect);
  buttonHandlers.set('approve_payment', (interaction) => handleApproveButton(interaction, xrayClient, client));
  buttonHandlers.set('decline_payment', (interaction) => handleDeclineButton(interaction));
  buttonHandlers.set('confirm_approve', (interaction) => handleConfirmApprove(interaction, xrayClient, client));
  buttonHandlers.set('confirm_decline', (interaction) => handleConfirmDecline(interaction, client));
  buttonHandlers.set('dashboard_refresh', handleDashboardRefresh);
  buttonHandlers.set('dashboard_export', handleDashboardExport);
  buttonHandlers.set('dashboard_backup', handleDashboardBackup);
  buttonHandlers.set('cancel_action', handleCancelAction);

  logger.info('Button handlers registered');
}

async function registerSlashCommands() {
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    const commandData = Array.from(commands.values()).map(cmd => cmd.data.toJSON());

    logger.info(`Registering ${commandData.length} slash commands...`);

    await rest.put(
      Routes.applicationGuildCommands(client.user.id, process.env.DISCORD_GUILD_ID),
      { body: commandData }
    );

    logger.info('Slash commands registered');
  } catch (error) {
    logger.error(`Register slash commands error: ${error.message}`);
  }
}

function setupScheduledTasks() {
  cron.schedule('*/5 * * * *', async () => {
    await RevenueService.updateRevenueCache();
    await updateDashboard(client);
  });

  cron.schedule('*/10 * * * *', async () => {
    await AuthMiddleware.cleanupExpiredSessions();
  });

  cron.schedule('*/5 * * * *', () => {
    rateLimiter.cleanup();
  });

  cron.schedule('*/30 * * * *', async () => {
    await messageCleanup.cleanup();
  });

  logger.info('Scheduled tasks initialized');
}

async function start() {
  try {
    await db.initialize();
    logger.info('Database initialized');

    await loadCommands();
    await loadEvents();
    registerButtonHandlers();
    setupMessageCreateListener();

    await client.login(process.env.DISCORD_BOT_TOKEN);

    await new Promise(resolve => client.once('ready', resolve));

    await registerSlashCommands();

    await initializeDashboard(client);

    setupScheduledTasks();

    messageCleanup.start();
    await healthMonitor.start();

    logger.info('Bot started successfully');
  } catch (error) {
    logger.error(`Startup error: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  healthMonitor.stop();
  messageCleanup.stop();
  await db.close();
  await client.destroy();
  process.exit(0);
});

start();
