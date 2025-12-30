import { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import db from '../models/database.js';
import rateLimiter from '../middleware/rate_limit.js';
import logger from '../utils/logger.js';
import plans from '../config/plans.json' assert { type: 'json' };

export default {
  data: new SlashCommandBuilder()
    .setName('order')
    .setDescription('Create a new VPN service order'),

  async execute(interaction) {
    const userId = interaction.user.id;

    // Rate limiting
    if (!rateLimiter.check(userId, 'order', 1)) {
      return interaction.reply({
        content: '⏱️ You can only create one order every 10 minutes.',
        ephemeral: true
      });
    }

    // Check for existing active orders
    const existingOrder = await db.get(
      `SELECT * FROM orders WHERE discord_id = ? AND status IN ('pending_payment', 'payment_submitted')`,
      [userId]
    );

    if (existingOrder) {
      return interaction.reply({
        content: '❌ You already have an active order. Please complete or cancel it first.',
        ephemeral: true
      });
    }

    // Create plan selection embed
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📦 Select Your VPN Plan')
      .setDescription('Choose a plan that suits your needs');

    plans.forEach(plan => {
      embed.addFields({
        name: `${plan.name} - ${plan.price} EGP`,
        value: `Duration: ${plan.duration_days} days\nTraffic: ${plan.traffic_gb}GB`,
        inline: true
      });
    });

    // Create select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('plan_select')
      .setPlaceholder('Select a plan')
      .addOptions(plans.map(plan => ({
        label: `${plan.name} - ${plan.price} EGP`,
        value: plan.id,
        description: `${plan.traffic_gb}GB for ${plan.duration_days} days`
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
  }
};
