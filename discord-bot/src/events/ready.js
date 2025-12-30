import { logger } from '../utils/logger.js';
import panelService from '../services/panelService.js';
import { setupCommand } from '../commands/admin.js';

export async function handleReady(client) {
  logger.info(`Bot logged in as ${client.user.tag}`);

  // Register slash commands
  try {
    const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
    if (guild) {
      await guild.commands.create(setupCommand);
      logger.info('Admin command registered');
    }
  } catch (error) {
    logger.error('Error registering commands', { message: error.message });
  }

  // Initialize persistent panels
  if (process.env.MAIN_PANEL_CHANNEL_ID) {
    await panelService.initializeMainPanel(client, process.env.MAIN_PANEL_CHANNEL_ID);
  }

  if (process.env.BILLING_CHANNEL_ID) {
    await panelService.initializeStatsPanel(client, process.env.BILLING_CHANNEL_ID);
  }

  // Set bot status
  client.user.setActivity('VPN Sales', { type: 'WATCHING' });
}
