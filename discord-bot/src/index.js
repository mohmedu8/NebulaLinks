import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init.js';
import { logger } from './utils/logger.js';
import { handleReady } from './events/ready.js';
import { handleInteractionCreate } from './events/interactionCreate.js';
import { handleMessageCreate } from './events/messageCreate.js';
import { startExpiryChecker } from './jobs/expiryChecker.js';
import { startTrafficMonitor } from './jobs/trafficMonitor.js';
import { startOrderTimeout } from './jobs/orderTimeout.js';
import { startHealthCheck } from './jobs/healthCheck.js';

dotenv.config();

// Initialize database
initializeDatabase();
logger.info('Database initialized');

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// Store client globally for services
global.client = client;

// Event handlers
client.on('ready', () => handleReady(client));
client.on('interactionCreate', handleInteractionCreate);
client.on('messageCreate', handleMessageCreate);

// Start background jobs
client.on('ready', () => {
  startExpiryChecker(client);
  startTrafficMonitor(client);
  startOrderTimeout(client);
  startHealthCheck(client);
  logger.info('Background jobs started');
});

// Error handling
client.on('error', error => {
  logger.error('Discord client error', { message: error.message });
});

process.on('unhandledRejection', error => {
  logger.error('Unhandled rejection', { message: error.message });
});

// Login
client.login(process.env.DISCORD_TOKEN);
