# Configuration Reference

## Environment Variables

### Discord Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DISCORD_BOT_TOKEN` | Yes | Discord bot authentication token | `MTA4MjM4NzA4NzI4NzA4NjA4.GxYzKw.abc123...` |
| `DISCORD_GUILD_ID` | Yes | Discord server ID where bot operates | `123456789012345678` |
| `OWNER_DISCORD_IDS` | Yes | Comma-separated owner Discord IDs | `123456789,987654321` |
| `ADMIN_DISCORD_IDS` | Yes | Comma-separated admin Discord IDs | `111111111,222222222` |

### 3x-ui Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `XRAY_API_URL` | Yes | 3x-ui panel API URL | `http://127.0.0.1:2053` |
| `XRAY_API_USERNAME` | Yes | 3x-ui admin username | `admin` |
| `XRAY_API_PASSWORD` | Yes | 3x-ui admin password | `your_password` |
| `DEFAULT_INBOUND_ID` | Yes | Default inbound ID for clients | `1` |

### Database Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | Database connection string | `sqlite:///data/bot.db` |

### Channel Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `ADMIN_REVIEW_CHANNEL_ID` | Yes | Channel ID for payment reviews | `123456789012345678` |
| `BILLING_DASHBOARD_CHANNEL_ID` | Yes | Channel ID for revenue dashboard | `987654321098765432` |

### Logging Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `LOG_LEVEL` | No | Logging level | `info` (error, warn, info, debug) |

## Plans Configuration

File: `config/plans.json`

```json
[
  {
    "id": "plan_1",
    "name": "Basic",
    "duration_days": 30,
    "traffic_gb": 50,
    "price": 100
  },
  {
    "id": "plan_2",
    "name": "Premium",
    "duration_days": 30,
    "traffic_gb": 150,
    "price": 250
  },
  {
    "id": "plan_3",
    "name": "Pro",
    "duration_days": 30,
    "traffic_gb": 300,
    "price": 450
  }
]
```

### Plan Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique plan identifier |
| `name` | string | Display name |
| `duration_days` | integer | Subscription duration in days |
| `traffic_gb` | integer | Traffic limit in GB |
| `price` | number | Price in EGP |

## Payment Methods Configuration

File: `config/payment_methods.json`

```json
{
  "vodafone_cash": {
    "name": "Vodafone Cash",
    "instructions": "Send to: 01XXXXXXXXX\nReference: ORDER-{order_id}"
  },
  "orange_cash": {
    "name": "Orange Cash",
    "instructions": "Send to: 01XXXXXXXXX\nReference: ORDER-{order_id}"
  },
  "etisalat_cash": {
    "name": "Etisalat Cash",
    "instructions": "Send to: 01XXXXXXXXX\nReference: ORDER-{order_id}"
  },
  "we_cash": {
    "name": "WE Cash",
    "instructions": "Send to: 01XXXXXXXXX\nReference: ORDER-{order_id}"
  },
  "instapay": {
    "name": "Instapay",
    "instructions": "Send to: 01XXXXXXXXX\nReference: ORDER-{order_id}"
  }
}
```

### Payment Method Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name |
| `instructions` | string | Payment instructions (supports {order_id} placeholder) |

## Rate Limiting Configuration

Configured in `src/middleware/rate_limit.js`:

| Command | Limit | Window |
|---------|-------|--------|
| `/order` | 1 | 10 minutes |
| Payment upload | 3 | Per order |
| Admin commands | 10 | 1 minute |

## Session Configuration

Configured in `src/middleware/auth.js`:

| Setting | Value | Description |
|---------|-------|-------------|
| Session Expiry | 5 minutes | Admin session token lifetime |
| One-time Use | Yes | Sessions can only be used once |

## Health Check Configuration

Configured in `src/services/health_monitor.js`:

| Setting | Value | Description |
|---------|-------|-------------|
| Check Interval | 60 seconds | How often to check 3x-ui health |
| Max Failures | 3 | Consecutive failures before marking unhealthy |

## Scheduled Tasks Configuration

Configured in `src/bot.js`:

| Task | Schedule | Description |
|------|----------|-------------|
| Revenue Cache Update | Every 5 minutes | Update financial data |
| Session Cleanup | Every 10 minutes | Remove expired sessions |
| Rate Limiter Cleanup | Every 5 minutes | Clean up rate limit counters |
| Message Cleanup | Every 30 minutes | Delete expired messages |

## Database Configuration

### Connection Pool

- Busy timeout: 5000ms
- Auto-initialize on startup
- SQLite3 backend

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts and VPN status |
| `orders` | Order records |
| `payments` | Payment submissions |
| `revenue_cache` | Financial data cache |
| `audit_logs` | Admin action logs |
| `admin_sessions` | Session tokens |
| `bot_config` | Bot configuration |
| `bot_messages` | Message tracking |

## Customization Guide

### Adding a New Plan

1. Edit `config/plans.json`
2. Add new plan object with unique `id`
3. Restart bot
4. Plan appears in `/order` command

Example:
```json
{
  "id": "plan_4",
  "name": "Enterprise",
  "duration_days": 90,
  "traffic_gb": 500,
  "price": 1000
}
```

### Adding a New Payment Method

1. Edit `config/payment_methods.json`
2. Add new method with key and instructions
3. Restart bot
4. Method appears in payment selection

Example:
```json
"bank_transfer": {
  "name": "Bank Transfer",
  "instructions": "Account: XXXXXXXXX\nReference: ORDER-{order_id}"
}
```

### Changing Rate Limits

Edit `src/middleware/rate_limit.js`:

```javascript
// In bot.js, modify the rate limit checks:
if (!rateLimiter.check(userId, 'order', 2)) {  // Change from 1 to 2
  // Allow 2 orders per 10 minutes
}
```

### Changing Session Expiry

Edit `src/middleware/auth.js`:

```javascript
const SESSION_EXPIRY_MS = 10 * 60 * 1000; // Change from 5 to 10 minutes
```

### Changing Health Check Interval

Edit `src/services/health_monitor.js`:

```javascript
const healthMonitor = new HealthMonitor(xrayClient, 120); // Change from 60 to 120 seconds
```

## Security Configuration

### Whitelist Management

Edit `.env`:
```
OWNER_DISCORD_IDS=owner1,owner2,owner3
ADMIN_DISCORD_IDS=admin1,admin2,admin3
```

### 3x-ui Credentials

Store securely in `.env`:
```
XRAY_API_USERNAME=admin
XRAY_API_PASSWORD=strong_password_here
```

### Database Backup

Automatic backups can be triggered via dashboard button or manually:
```bash
cp data/bot.db data/bot.db.backup
```

## Monitoring Configuration

### Log Levels

- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging information

Set in `.env`:
```
LOG_LEVEL=debug
```

### Log Files

- `logs/bot.log` - General logs
- `logs/error.log` - Error logs only

## Performance Tuning

### Database Optimization

- Indexes on frequently queried columns
- Connection pooling enabled
- Busy timeout: 5000ms

### Caching

- Revenue data cached for 5 minutes
- Reduces database queries
- Automatic refresh on schedule

### Message Cleanup

- Runs every 30 minutes
- Batch deletes up to 100 messages
- Prevents memory leaks

## Troubleshooting Configuration

### Bot not starting

Check `.env` has all required variables:
```bash
grep -E "DISCORD_BOT_TOKEN|DISCORD_GUILD_ID|XRAY_API" .env
```

### 3x-ui connection failed

Verify credentials:
```bash
curl -X POST http://127.0.0.1:2053/panel/api/login \
  -d "username=admin&password=admin"
```

### Database locked

Increase busy timeout in `src/models/database.js`:
```javascript
this.db.configure('busyTimeout', 10000); // Increase from 5000
```

### High memory usage

Reduce cleanup interval in `src/bot.js`:
```javascript
cron.schedule('*/15 * * * *', async () => { // Change from 30 to 15 minutes
  await messageCleanup.cleanup();
});
```
