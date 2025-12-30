import { v4 as uuidv4 } from 'uuid';
import db from '../models/database.js';
import logger from '../utils/logger.js';

const OWNER_IDS = (process.env.OWNER_DISCORD_IDS || '').split(',').filter(Boolean);
const ADMIN_IDS = (process.env.ADMIN_DISCORD_IDS || '').split(',').filter(Boolean);
const SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export class AuthMiddleware {
  static checkRole(requiredRoles) {
    return async (interaction) => {
      const userRoles = interaction.member?.roles?.cache?.map(r => r.name) || [];
      return requiredRoles.some(role => userRoles.includes(role));
    };
  }

  static checkWhitelist(discordId) {
    return OWNER_IDS.includes(discordId) || ADMIN_IDS.includes(discordId);
  }

  static isOwner(discordId) {
    return OWNER_IDS.includes(discordId);
  }

  static isAdmin(discordId) {
    return ADMIN_IDS.includes(discordId) || OWNER_IDS.includes(discordId);
  }

  static async createAdminSession(adminId, actionType, payload) {
    try {
      const sessionToken = uuidv4();
      const expiresAt = Date.now() + SESSION_EXPIRY_MS;

      await db.run(
        `INSERT INTO admin_sessions (session_token, admin_discord_id, action_type, action_payload, expires_at)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionToken, adminId, actionType, JSON.stringify(payload), Math.floor(expiresAt / 1000)]
      );

      logger.info(`Admin session created: ${sessionToken} for ${adminId}`);
      return sessionToken;
    } catch (error) {
      logger.error(`Create session error: ${error.message}`);
      return null;
    }
  }

  static async validateSession(sessionToken, adminId) {
    try {
      const session = await db.get(
        `SELECT * FROM admin_sessions WHERE session_token = ? AND admin_discord_id = ?`,
        [sessionToken, adminId]
      );

      if (!session) {
        logger.warn(`Invalid session token: ${sessionToken}`);
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        logger.warn(`Session expired: ${sessionToken}`);
        return null;
      }

      if (session.consumed) {
        logger.warn(`Session already consumed: ${sessionToken}`);
        return null;
      }

      return session;
    } catch (error) {
      logger.error(`Validate session error: ${error.message}`);
      return null;
    }
  }

  static async consumeSession(sessionToken) {
    try {
      await db.run(
        `UPDATE admin_sessions SET consumed = 1 WHERE session_token = ?`,
        [sessionToken]
      );
      logger.info(`Session consumed: ${sessionToken}`);
      return true;
    } catch (error) {
      logger.error(`Consume session error: ${error.message}`);
      return false;
    }
  }

  static async cleanupExpiredSessions() {
    try {
      const now = Math.floor(Date.now() / 1000);
      const result = await db.run(
        `DELETE FROM admin_sessions WHERE expires_at < ?`,
        [now]
      );
      if (result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} expired sessions`);
      }
    } catch (error) {
      logger.error(`Cleanup sessions error: ${error.message}`);
    }
  }

  static async logAuditAction(adminId, actionType, targetDiscordId, targetOrderId, details) {
    try {
      await db.run(
        `INSERT INTO audit_logs (admin_discord_id, action_type, target_discord_id, target_order_id, action_details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, actionType, targetDiscordId, targetOrderId, JSON.stringify(details)]
      );
      logger.info(`Audit log: ${actionType} by ${adminId}`);
    } catch (error) {
      logger.error(`Audit log error: ${error.message}`);
    }
  }
}

export default AuthMiddleware;
