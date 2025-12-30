import { EmbedBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';

export async function handleSupport(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('💬 Support')
      .addFields(
        { name: 'Contact Admin', value: `<@${process.env.ADMIN_ROLE_ID || 'admin'}>`, inline: false },
        { name: 'FAQ', value: '• How do I connect? - Use the VLESS link in your client app\n• How long is my account valid? - Check your account details\n• Can I extend my subscription? - Yes, use the Renew button', inline: false },
        { name: 'Response Time', value: 'Usually within 24 hours', inline: false }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    logger.info('Support menu shown', { userId: interaction.user.id });
  } catch (error) {
    logger.error('Error in support handler', { message: error.message });
    await interaction.editReply({ content: '❌ An error occurred' }).catch(() => {});
  }
}
