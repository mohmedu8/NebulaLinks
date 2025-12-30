import logger from '../utils/logger.js';

export default {
  name: 'interactionCreate',
  async execute(interaction, commandHandlers, buttonHandlers) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commandHandlers.get(interaction.commandName);
        if (!command) {
          logger.warn(`Command not found: ${interaction.commandName}`);
          return;
        }

        try {
          await command.execute(interaction);
        } catch (error) {
          logger.error(`Command error (${interaction.commandName}): ${error.message}`);
          const reply = { content: '❌ An error occurred while executing this command.', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      } else if (interaction.isButton()) {
        const customId = interaction.customId;
        let handler = buttonHandlers.get(customId);

        // Check for prefix-based handlers
        if (!handler) {
          if (customId.startsWith('approve_payment_')) {
            handler = buttonHandlers.get('approve_payment');
          } else if (customId.startsWith('decline_payment_')) {
            handler = buttonHandlers.get('decline_payment');
          } else if (customId.startsWith('confirm_approve_')) {
            handler = buttonHandlers.get('confirm_approve');
          } else if (customId.startsWith('confirm_decline_')) {
            handler = buttonHandlers.get('confirm_decline');
          }
        }

        if (!handler) {
          logger.warn(`Button handler not found: ${customId}`);
          return;
        }

        try {
          await handler(interaction);
        } catch (error) {
          logger.error(`Button handler error (${customId}): ${error.message}`);
          const reply = { content: '❌ An error occurred.', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      } else if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;
        const handler = buttonHandlers.get(customId);

        if (!handler) {
          logger.warn(`Select menu handler not found: ${customId}`);
          return;
        }

        try {
          await handler(interaction);
        } catch (error) {
          logger.error(`Select menu error (${customId}): ${error.message}`);
          const reply = { content: '❌ An error occurred.', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.editReply(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      }
    } catch (error) {
      logger.error(`Interaction handler error: ${error.message}`);
    }
  }
};
