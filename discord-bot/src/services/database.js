import { getDatabase } from './init.js';
import { logger } from '../utils/logger.js';

class DatabaseService {
  constructor() {
    this.db = getDatabase();
  }

  // User operations
  createUser(discordId, discordUsername) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO users (discord_id, discord_username, status)
        VALUES (?, ?, 'NEW')
      `);
      const result = stmt.run(discordId, discordUsername);
      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Error creating user', { discordId, message: error.message });
      throw error;
    }
  }

  getUserByDiscordId(discordId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM users WHERE discord_id = ?');
      return stmt.get(discordId);
    } catch (error) {
      logger.error('Error getting user', { discordId, message: error.message });
      throw error;
    }
  }

  // Order operations
  createOrder(userId, durationDays, trafficGb, priceEgp, paymentMethod, channelId) {
    try {
      const orderId = `ORD-${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const stmt = this.db.prepare(`
        INSERT INTO orders (order_id, user_id, duration_days, traffic_gb, price_egp, payment_method, channel_id, status, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
      `);
      const result = stmt.run(orderId, userId, durationDays, trafficGb, priceEgp, paymentMethod, channelId, expiresAt);
      return { id: result.lastInsertRowid, orderId };
    } catch (error) {
      logger.error('Error creating order', { userId, message: error.message });
      throw error;
    }
  }

  getOrderById(orderId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM orders WHERE id = ?');
      return stmt.get(orderId);
    } catch (error) {
      logger.error('Error getting order', { orderId, message: error.message });
      throw error;
    }
  }

  getOrderByOrderId(orderIdStr) {
    try {
      const stmt = this.db.prepare('SELECT * FROM orders WHERE order_id = ?');
      return stmt.get(orderIdStr);
    } catch (error) {
      logger.error('Error getting order', { orderIdStr, message: error.message });
      throw error;
    }
  }

  updateOrderStatus(orderId, status) {
    try {
      const stmt = this.db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(status, orderId);
    } catch (error) {
      logger.error('Error updating order status', { orderId, message: error.message });
      throw error;
    }
  }

  updateOrderPaymentMethod(orderId, paymentMethod) {
    try {
      const stmt = this.db.prepare('UPDATE orders SET payment_method = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(paymentMethod, orderId);
    } catch (error) {
      logger.error('Error updating payment method', { orderId, message: error.message });
      throw error;
    }
  }

  updateOrderScreenshot(orderId, screenshotUrl) {
    try {
      const stmt = this.db.prepare('UPDATE orders SET screenshot_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(screenshotUrl, 'WAITING_REVIEW', orderId);
    } catch (error) {
      logger.error('Error updating order screenshot', { orderId, message: error.message });
      throw error;
    }
  }

  approveOrder(orderId, reviewedBy) {
    try {
      const stmt = this.db.prepare(`
        UPDATE orders 
        SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(reviewedBy, orderId);
    } catch (error) {
      logger.error('Error approving order', { orderId, message: error.message });
      throw error;
    }
  }

  declineOrder(orderId, reviewedBy, reason) {
    try {
      const stmt = this.db.prepare(`
        UPDATE orders 
        SET status = 'DECLINED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, decline_reason = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `);
      stmt.run(reviewedBy, reason, orderId);
    } catch (error) {
      logger.error('Error declining order', { orderId, message: error.message });
      throw error;
    }
  }

  // VPN Account operations
  createVPNAccount(userId, serverId, uuid, vlessLink, expiryDate, trafficLimitGb) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO vpn_accounts (user_id, server_id, uuid, vless_link, expiry_date, traffic_limit_gb, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
      `);
      const result = stmt.run(userId, serverId, uuid, vlessLink, expiryDate, trafficLimitGb);
      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Error creating VPN account', { userId, message: error.message });
      throw error;
    }
  }

  getVPNAccountByUUID(uuid) {
    try {
      const stmt = this.db.prepare('SELECT * FROM vpn_accounts WHERE uuid = ?');
      return stmt.get(uuid);
    } catch (error) {
      logger.error('Error getting VPN account', { uuid, message: error.message });
      throw error;
    }
  }

  getUserVPNAccounts(userId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM vpn_accounts WHERE user_id = ? AND status = ?');
      return stmt.all(userId, 'ACTIVE');
    } catch (error) {
      logger.error('Error getting user VPN accounts', { userId, message: error.message });
      throw error;
    }
  }

  updateVPNAccountStatus(uuid, status) {
    try {
      const stmt = this.db.prepare('UPDATE vpn_accounts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?');
      stmt.run(status, uuid);
    } catch (error) {
      logger.error('Error updating VPN account status', { uuid, message: error.message });
      throw error;
    }
  }

  updateVPNAccountTraffic(uuid, trafficUsedGb) {
    try {
      const stmt = this.db.prepare('UPDATE vpn_accounts SET traffic_used_gb = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?');
      stmt.run(trafficUsedGb, uuid);
    } catch (error) {
      logger.error('Error updating VPN account traffic', { uuid, message: error.message });
      throw error;
    }
  }

  // Server operations
  addServer(name, apiEndpoint, inboundId, capacity) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO servers (name, api_endpoint, inbound_id, capacity, status)
        VALUES (?, ?, ?, ?, 'ACTIVE')
      `);
      const result = stmt.run(name, apiEndpoint, inboundId, capacity);
      return result.lastInsertRowid;
    } catch (error) {
      logger.error('Error adding server', { name, message: error.message });
      throw error;
    }
  }

  getActiveServers() {
    try {
      const stmt = this.db.prepare('SELECT * FROM servers WHERE status = ? ORDER BY current_load ASC');
      return stmt.all('ACTIVE');
    } catch (error) {
      logger.error('Error getting active servers', { message: error.message });
      throw error;
    }
  }

  selectLeastLoadedServer() {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM servers 
        WHERE status = 'ACTIVE' AND current_load < capacity 
        ORDER BY (current_load / capacity) ASC 
        LIMIT 1
      `);
      return stmt.get();
    } catch (error) {
      logger.error('Error selecting server', { message: error.message });
      throw error;
    }
  }

  updateServerLoad(serverId, increment) {
    try {
      const stmt = this.db.prepare('UPDATE servers SET current_load = current_load + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(increment, serverId);
    } catch (error) {
      logger.error('Error updating server load', { serverId, message: error.message });
      throw error;
    }
  }

  // Plan operations
  getActivePlans() {
    try {
      const stmt = this.db.prepare('SELECT * FROM plans WHERE is_active = 1 ORDER BY price_egp ASC');
      return stmt.all();
    } catch (error) {
      logger.error('Error getting active plans', { message: error.message });
      throw error;
    }
  }

  getPlanById(planId) {
    try {
      const stmt = this.db.prepare('SELECT * FROM plans WHERE id = ?');
      return stmt.get(planId);
    } catch (error) {
      logger.error('Error getting plan', { planId, message: error.message });
      throw error;
    }
  }

  // Audit log operations
  createAuditLog(action, actorId, targetId, details) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO audit_logs (action, actor_id, target_id, details)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(action, actorId, targetId, JSON.stringify(details));
    } catch (error) {
      logger.error('Error creating audit log', { action, message: error.message });
      throw error;
    }
  }

  // Revenue operations
  getDailyRevenue(date) {
    try {
      const stmt = this.db.prepare(`
        SELECT COALESCE(SUM(price_egp), 0) as total 
        FROM orders 
        WHERE status = 'APPROVED' AND DATE(created_at) = ?
      `);
      return stmt.get(date).total;
    } catch (error) {
      logger.error('Error getting daily revenue', { date, message: error.message });
      throw error;
    }
  }

  getMonthlyRevenue(year, month) {
    try {
      const stmt = this.db.prepare(`
        SELECT COALESCE(SUM(price_egp), 0) as total 
        FROM orders 
        WHERE status = 'APPROVED' AND strftime('%Y-%m', created_at) = ?
      `);
      return stmt.get(`${year}-${String(month).padStart(2, '0')}`).total;
    } catch (error) {
      logger.error('Error getting monthly revenue', { year, month, message: error.message });
      throw error;
    }
  }

  getActiveUserCount() {
    try {
      const stmt = this.db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM vpn_accounts 
        WHERE status = 'ACTIVE' AND expiry_date > CURRENT_TIMESTAMP
      `);
      return stmt.get().count;
    } catch (error) {
      logger.error('Error getting active user count', { message: error.message });
      throw error;
    }
  }

  // UI State operations
  setUIState(key, value) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO ui_state (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(key, value);
    } catch (error) {
      logger.error('Error setting UI state', { key, message: error.message });
      throw error;
    }
  }

  getUIState(key) {
    try {
      const stmt = this.db.prepare('SELECT value FROM ui_state WHERE key = ?');
      const result = stmt.get(key);
      return result ? result.value : null;
    } catch (error) {
      logger.error('Error getting UI state', { key, message: error.message });
      throw error;
    }
  }
}

export default new DatabaseService();
