import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/bot.db');

export class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('Database connection error:', err);
      else console.log('Connected to SQLite database');
    });
    this.db.configure('busyTimeout', 5000);
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            discord_id TEXT UNIQUE NOT NULL,
            xray_uuid TEXT UNIQUE,
            xray_email TEXT UNIQUE,
            status TEXT DEFAULT 'pending',
            expiry_date INTEGER,
            traffic_limit_gb INTEGER,
            traffic_used_gb INTEGER DEFAULT 0,
            inbound_id INTEGER,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
          )
        `);

        // Orders table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS orders (
            order_id TEXT PRIMARY KEY,
            discord_id TEXT NOT NULL,
            plan_name TEXT NOT NULL,
            plan_duration_days INTEGER NOT NULL,
            plan_traffic_gb INTEGER NOT NULL,
            plan_price REAL NOT NULL,
            server_node TEXT,
            status TEXT DEFAULT 'pending_payment',
            ticket_channel_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            updated_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (discord_id) REFERENCES users(discord_id)
          )
        `);

        // Payments table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL UNIQUE,
            payment_method TEXT NOT NULL,
            amount REAL NOT NULL,
            screenshot_url TEXT,
            screenshot_hash TEXT UNIQUE,
            submitted_at INTEGER DEFAULT (strftime('%s', 'now')),
            reviewed_by TEXT,
            review_status TEXT DEFAULT 'pending',
            review_reason TEXT,
            reviewed_at INTEGER,
            FOREIGN KEY (order_id) REFERENCES orders(order_id)
          )
        `);

        // Revenue cache table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS revenue_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_type TEXT NOT NULL,
            period_start INTEGER NOT NULL,
            period_end INTEGER NOT NULL,
            total_revenue REAL DEFAULT 0,
            total_orders INTEGER DEFAULT 0,
            approved_orders INTEGER DEFAULT 0,
            declined_orders INTEGER DEFAULT 0,
            last_updated INTEGER DEFAULT (strftime('%s', 'now')),
            UNIQUE(period_type, period_start, period_end)
          )
        `);

        // Audit logs table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_discord_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            target_discord_id TEXT,
            target_order_id TEXT,
            action_details TEXT,
            ip_address TEXT,
            session_token TEXT,
            timestamp INTEGER DEFAULT (strftime('%s', 'now'))
          )
        `);

        // Admin sessions table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS admin_sessions (
            session_token TEXT PRIMARY KEY,
            admin_discord_id TEXT NOT NULL,
            action_type TEXT NOT NULL,
            action_payload TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            expires_at INTEGER,
            consumed INTEGER DEFAULT 0
          )
        `);

        // Bot config table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS bot_config (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });

        // Bot messages table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS bot_messages (
            message_id TEXT PRIMARY KEY,
            channel_id TEXT NOT NULL,
            type TEXT NOT NULL,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            delete_after INTEGER
          )
        `);

        // Create indexes
        this.db.run('CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_orders_discord_id ON orders(discord_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_discord_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)');
      });
    });
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

export default new Database();
