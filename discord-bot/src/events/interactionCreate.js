import { logger } from '../utils/logger.js';
import { handleBuyAccess } from '../interactions/buttons/buyAccess.js';
import { handleMyAccount } from '../interactions/buttons/myAccount.js';
import { handleSupport } from '../interactions/buttons/support.js';
import { handleReviewApprove, handleDeclineReasonSubmit } from '../interactions/buttons/reviewDecline.js';
import { handlePlanSelection, handlePaymentMethodSelection } from '../interactions/selectMenus/planSelection.js';
import { handleAdminCommand } from '../commands/admin.js';

export async function handleInteractionCreate(interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'admin') {
        await handleAdminCommand(interaction);
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === 'btn_buy_access') {
        await handleBuyAccess(interaction);
      } else if (interaction.customId === 'btn_my_account') {
        await handleMyAccount(interaction);
      } else if (interaction.customId === 'btn_support') {
        await handleSupport(interaction);
      } else if (interaction.customId.startsWith('review_approve_')) {
        await handleReviewApprove(interaction);
      } else if (interaction.customId.startsWith('payment_')) {
        await handlePaymentMethodSelection(interaction);
      }
    } else if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'select_plan') {
        await handlePlanSelection(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('decline_reason_')) {
        await handleDeclineReasonSubmit(interaction);
      }
    }
  } catch (error) {
    logger.error('Error handling interaction', { message: error.message });
    await interaction.reply({ content: '❌ An error occurred', ephemeral: true }).catch(() => {});
  }
}
