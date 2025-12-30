import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import db from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export async function handleBuyAccess(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const plans = db.getActivePlans();
    if (plans.length === 0) {
      return interaction.editReply({ content: '❌ No plans available at the moment' });
    }

    const options = plans.map(plan => ({
      label: `${plan.name} - ${plan.price_egp} EGP`,
      value: `plan_${plan.id}`,
      description: `${plan.duration_days} days, ${plan.traffic_gb}GB`
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_plan')
      .setPlaceholder('Choose a plan')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('📦 Select Your Plan')
      .setDescription('Choose the plan that best fits your needs')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [row] });
    logger.info('Buy access menu shown', { userId: interaction.user.id });
  } catch (error) {
    logger.error('Error in buy access handler', { message: error.message });
    await interaction.editReply({ content: '❌ An error occurred' }).catch(() => {});
  }
}
