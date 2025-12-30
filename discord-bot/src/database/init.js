import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/bot.db');

export function initializeDatabase() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discord_id TEXT UNIQUE NOT NULL,
      discord_username TEXT NOT NULL,
      status TEXT DEFAULT 'NEW' CHECK(status IN ('NEW', 'ACTIVE', 'EXPIRED', 'SUSPENDED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
  `);

  // VPN Accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS vpn_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      server_id INTEGER NOT NULL,
      uuid TEXT UNIQUE NOT NULL,
      vless_link TEXT,
      expiry_date DATETIME NOT NULL,
      traffic_limit_gb INTEGER NOT NULL,
      traffic_used_gb REAL DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'DISABLED', 'SUSPENDED')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (server_id) REFERENCES servers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_vpn_accounts_user_id ON vpn_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_vpn_accounts_uuid ON vpn_accounts(uuid);
    CREATE INDEX IF NOT EXISTS idx_vpn_accounts_expiry ON vpn_accounts(expiry_date);
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'WAITING_PAYMENT', 'WAITING_REVIEW', 'APPROVED', 'DECLINED', 'EXPIRED')),
      duration_days INTEGER NOT NULL,
      traffic_gb INTEGER NOT NULL,
      price_egp DECIMAL(10, 2) NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('VODAFONE', 'ORANGE', 'ETISALAT', 'WE', 'INSTAPAY')),
      channel_id TEXT,
      screenshot_url TEXT,
      reviewed_by TEXT,
      reviewed_at DATETIME,
      decline_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  `);

  // Payments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      amount_egp DECIMAL(10, 2) NOT NULL,
      payment_method TEXT NOT NULL,
      wallet_number TEXT,
      receiver_name TEXT,
      screenshot_url TEXT,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'VERIFIED', 'REJECTED')),
      verified_by TEXT,
      verified_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
  `);

  // Servers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_endpoint TEXT NOT NULL,
      inbound_id INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      current_load INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'MAINTENANCE', 'OFFLINE')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
  `);

  // Plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      traffic_gb INTEGER NOT NULL,
      price_egp DECIMAL(10, 2) NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      actor_id TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
  `);

  // Revenue snapshots table
  db.exec(`
    CREATE TABLE IF NOT EXISTS revenue_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL UNIQUE,
      daily_revenue DECIMAL(10, 2) DEFAULT 0,
      monthly_revenue DECIMAL(10, 2) DEFAULT 0,
      yearly_revenue DECIMAL(10, 2) DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      active_users INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_revenue_snapshots_date ON revenue_snapshots(date);
  `);

  // UI State table (for persistent messages)
  db.exec(`
    CREATE TABLE IF NOT EXISTS ui_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

export function getDatabase() {
  return new Database(dbPath);
}
