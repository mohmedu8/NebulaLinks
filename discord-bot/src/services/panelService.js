import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import db from './database.js';
import { logger } from '../utils/logger.js';

class PanelService {
  async initializeMainPanel(client, channelId) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        logger.error('Channel not found', { channelId });
        return;
      }

      const plans = db.getActivePlans();
      const plansList = plans.map(p => `• **${p.name}**: ${p.duration_days} days, ${p.traffic_gb}GB - ${p.price_egp} EGP`).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🌐 NebulaLinks VPN Service')
        .setDescription('Welcome to NebulaLinks - Your premium VPN access provider')
        .addFields(
          { name: '✨ Features', value: '• Fast & Secure\n• Multiple Servers\n• 24/7 Support\n• Instant Activation', inline: false },
          { name: '📦 Available Plans', value: plansList || 'No plans available', inline: false }
        )
        .setFooter({ text: 'Click the buttons below to get started' })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('btn_buy_access')
            .setLabel('🛒 Buy Access')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('btn_my_account')
            .setLabel('👤 My Account')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('btn_support')
            .setLabel('💬 Support')
            .setStyle(ButtonStyle.Secondary)
        );

      // Check if panel message already exists
      const existingMessageId = db.getUIState('main_panel_message_id');
      
      if (existingMessageId) {
        try {
          const message = await channel.messages.fetch(existingMessageId);
          await message.edit({ embeds: [embed], components: [row] });
          logger.info('Main panel updated', { channelId });
        } catch (error) {
          logger.warn('Could not update existing panel message', { messageId: existingMessageId });
          const message = await channel.send({ embeds: [embed], components: [row] });
          db.setUIState('main_panel_message_id', message.id);
          logger.info('New main panel created', { channelId, messageId: message.id });
        }
      } else {
        const message = await channel.send({ embeds: [embed], components: [row] });
        db.setUIState('main_panel_message_id', message.id);
        logger.info('Main panel created', { channelId, messageId: message.id });
      }

      // Clean up other bot messages
      await this.cleanupChannel(channel);
    } catch (error) {
      logger.error('Error initializing main panel', { channelId, message: error.message });
    }
  }

  async initializeStatsPanel(client, channelId) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        logger.error('Channel not found', { channelId });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;

      const dailyRevenue = db.getDailyRevenue(today);
      const monthlyRevenue = db.getMonthlyRevenue(year, month);
      const activeUsers = db.getActiveUserCount();
      const servers = db.getActiveServers();

      const serverLoad = servers.map(s => `${s.name}: ${s.current_load}/${s.capacity}`).join('\n') || 'No servers';

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('📊 Billing & Analytics')
        .addFields(
          { name: '💰 Today\'s Revenue', value: `${dailyRevenue} EGP`, inline: true },
          { name: '📅 This Month', value: `${monthlyRevenue} EGP`, inline: true },
          { name: '👥 Active Users', value: activeUsers.toString(), inline: true },
          { name: '🌐 Server Load', value: serverLoad, inline: false }
        )
        .setFooter({ text: 'Last updated' })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('billing_export_csv')
            .setLabel('📥 Export CSV')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('billing_export_json')
            .setLabel('📥 Export JSON')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('billing_audit_log')
            .setLabel('📜 Audit Log')
            .setStyle(ButtonStyle.Secondary)
        );

      const existingMessageId = db.getUIState('stats_panel_message_id');

      if (existingMessageId) {
        try {
          const message = await channel.messages.fetch(existingMessageId);
          await message.edit({ embeds: [embed], components: [row] });
          logger.info('Stats panel updated', { channelId });
        } catch (error) {
          logger.warn('Could not update existing stats panel', { messageId: existingMessageId });
          const message = await channel.send({ embeds: [embed], components: [row] });
          db.setUIState('stats_panel_message_id', message.id);
          logger.info('New stats panel created', { channelId, messageId: message.id });
        }
      } else {
        const message = await channel.send({ embeds: [embed], components: [row] });
        db.setUIState('stats_panel_message_id', message.id);
        logger.info('Stats panel created', { channelId, messageId: message.id });
      }
    } catch (error) {
      logger.error('Error initializing stats panel', { channelId, message: error.message });
    }
  }

  async cleanupChannel(channel) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const botMessages = messages.filter(m => m.author.id === m.client.user.id);
      
      for (const [, message] of botMessages) {
        if (message.id !== db.getUIState('main_panel_message_id') && 
            message.id !== db.getUIState('stats_panel_message_id')) {
          await message.delete().catch(() => {});
        }
      }
    } catch (error) {
      logger.warn('Error cleaning up channel', { message: error.message });
    }
  }

  async scheduleChannelDeletion(channelId, delayHours = 24) {
    try {
      setTimeout(async () => {
        const channel = await global.client.channels.fetch(channelId).catch(() => null);
        if (channel) {
          await channel.delete('Order completed - auto cleanup');
          logger.info('Order channel deleted', { channelId });
        }
      }, delayHours * 60 * 60 * 1000);
    } catch (error) {
      logger.error('Error scheduling channel deletion', { channelId, message: error.message });
    }
  }
}

export default new PanelService();
