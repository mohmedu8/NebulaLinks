import cron from 'node-cron';
import db from '../services/database.js';
import apiClient from '../services/apiClient.js';
import { logger } from '../utils/logger.js';

export function startExpiryChecker(client) {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running expiry checker job');

      const stmt = db.db.prepare(`
        SELECT * FROM vpn_accounts 
        WHERE status = 'ACTIVE' AND expiry_date < datetime('now')
      `);
      const expiredAccounts = stmt.all();

      for (const account of expiredAccounts) {
        try {
          // Disable account on 3x-ui
          await apiClient.disableAccount(account.uuid, account.server_id, account.uuid);

          // Update database
          db.updateVPNAccountStatus(account.uuid, 'EXPIRED');

          // Send DM to user
          const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(account.user_id);
          if (user) {
            const discordUser = await client.users.fetch(user.discord_id).catch(() => null);
            if (discordUser) {
              await discordUser.send('⚠️ Your VPN account has expired. Please renew to continue using the service.');
            }
          }

          // Create audit log
          db.createAuditLog('ACCOUNT_EXPIRED', 'SYSTEM', account.uuid, {
            reason: 'Expiry date reached'
          });

          logger.info('Account expired', { uuid: account.uuid });
        } catch (error) {
          logger.error('Error expiring account', { uuid: account.uuid, message: error.message });
        }
      }

      // Check for accounts expiring in 24 hours
      const stmt2 = db.db.prepare(`
        SELECT * FROM vpn_accounts 
        WHERE status = 'ACTIVE' 
        AND expiry_date > datetime('now')
        AND expiry_date < datetime('now', '+1 day')
      `);
      const expiringAccounts = stmt2.all();

      for (const account of expiringAccounts) {
        try {
          const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(account.user_id);
          if (user) {
            const discordUser = await client.users.fetch(user.discord_id).catch(() => null);
            if (discordUser) {
              await discordUser.send('⏰ Your VPN account expires in 24 hours. Use the Renew button to extend your subscription.');
            }
          }
        } catch (error) {
          logger.error('Error sending expiry reminder', { uuid: account.uuid, message: error.message });
        }
      }

      logger.info('Expiry checker completed', { expired: expiredAccounts.length, expiring: expiringAccounts.length });
    } catch (error) {
      logger.error('Error in expiry checker job', { message: error.message });
    }
  });
}
