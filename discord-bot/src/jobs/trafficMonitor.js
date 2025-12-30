import cron from 'node-cron';
import db from '../services/database.js';
import apiClient from '../services/apiClient.js';
import { logger } from '../utils/logger.js';

export function startTrafficMonitor(client) {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      logger.info('Running traffic monitor job');

      const stmt = db.db.prepare(`
        SELECT va.*, s.inbound_id FROM vpn_accounts va
        JOIN servers s ON va.server_id = s.id
        WHERE va.status = 'ACTIVE'
      `);
      const accounts = stmt.all();

      for (const account of accounts) {
        try {
          const email = `user_${account.user_id}_${account.id}@nebulalinks.local`;
          const stats = await apiClient.getAccountStats(email, account.inbound_id);

          if (stats.success && stats.data) {
            const trafficUsedGb = (stats.data.traffic || 0) / (1024 * 1024 * 1024);
            db.updateVPNAccountTraffic(account.uuid, trafficUsedGb);

            const trafficPercent = (trafficUsedGb / account.traffic_limit_gb) * 100;

            // Send warning at 90%
            if (trafficPercent >= 90 && trafficPercent < 100) {
              const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(account.user_id);
              if (user) {
                const discordUser = await client.users.fetch(user.discord_id).catch(() => null);
                if (discordUser) {
                  await discordUser.send(`⚠️ You've used ${trafficPercent.toFixed(1)}% of your traffic limit`);
                }
              }
            }

            // Suspend at 100%
            if (trafficPercent >= 100) {
              await apiClient.disableAccount(account.uuid, account.inbound_id, account.uuid);
              db.updateVPNAccountStatus(account.uuid, 'SUSPENDED');

              const user = db.db.prepare('SELECT * FROM users WHERE id = ?').get(account.user_id);
              if (user) {
                const discordUser = await client.users.fetch(user.discord_id).catch(() => null);
                if (discordUser) {
                  await discordUser.send('🚫 Your account has been suspended - traffic limit reached');
                }
              }

              db.createAuditLog('ACCOUNT_SUSPENDED', 'SYSTEM', account.uuid, {
                reason: 'Traffic limit exceeded'
              });
            }
          }
        } catch (error) {
          logger.error('Error monitoring account traffic', { uuid: account.uuid, message: error.message });
        }
      }

      logger.info('Traffic monitor completed', { accountsChecked: accounts.length });
    } catch (error) {
      logger.error('Error in traffic monitor job', { message: error.message });
    }
  });
}
