import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from '../../services/database.js';
import { logger } from '../../utils/logger.js';

export async function handleMyAccount(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    let user = db.getUserByDiscordId(interaction.user.id);
    if (!user) {
      user = { id: db.createUser(interaction.user.id, interaction.user.username) };
    }

    const accounts = db.getUserVPNAccounts(user.id);

    if (accounts.length === 0) {
      return interaction.editReply({ content: "❌ You don't have any active VPN accounts yet" });
    }

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('👤 My VPN Accounts')
      .setDescription(`You have ${accounts.length} active account(s)`)
      .setTimestamp();

    accounts.forEach((account, index) => {
      const maskedUUID = account.uuid.substring(0, 4) + '-' + account.uuid.substring(account.uuid.length - 4);
      const expiryDate = new Date(account.expiry_date).toLocaleDateString();
      const trafficPercent = ((account.traffic_used_gb / account.traffic_limit_gb) * 100).toFixed(1);

      embed.addFields({
        name: `Account ${index + 1}`,
        value: `UUID: \`${maskedUUID}\`\nExpiry: ${expiryDate}\nTraffic: ${account.traffic_used_gb}/${account.traffic_limit_gb}GB (${trafficPercent}%)\nStatus: ${account.status}`,
        inline: false
      });
    });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('btn_view_details')
          .setLabel('📊 View Details')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('btn_renew')
          .setLabel('🔄 Renew')
          .setStyle(ButtonStyle.Primary)
      );

    await interaction.editReply({ embeds: [embed], components: [row] });
    logger.info('My account shown', { userId: interaction.user.id });
  } catch (error) {
    logger.error('Error in my account handler', { message: error.message });
    await interaction.editReply({ content: '❌ An error occurred' }).catch(() => {});
  }
}
