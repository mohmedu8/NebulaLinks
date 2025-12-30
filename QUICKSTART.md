# Quick Start Guide

## Local Development Setup

### Prerequisites
- Node.js 18+ (https://nodejs.org/)
- Discord Bot Token (https://discord.com/developers/applications)
- 3x-ui Panel running on localhost:2053
- Git

### Step 1: Clone and Install

```bash
cd bot
npm install
```

### Step 2: Create Discord Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Go to "Bot" section and click "Add Bot"
4. Copy the token
5. Go to "OAuth2" → "URL Generator"
6. Select scopes: `bot`
7. Select permissions: `Send Messages`, `Embed Links`, `Manage Channels`, `Read Message History`
8. Copy the generated URL and open it to invite bot to your server

### Step 3: Configure Environment

Create `.env` file in `bot/` directory:

```bash
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_server_id_here
OWNER_DISCORD_IDS=your_discord_id
ADMIN_DISCORD_IDS=your_discord_id
XRAY_API_URL=http://127.0.0.1:2053
XRAY_API_USERNAME=admin
XRAY_API_PASSWORD=admin
DATABASE_URL=sqlite:///data/bot.db
ADMIN_REVIEW_CHANNEL_ID=channel_id_for_admin_review
BILLING_DASHBOARD_CHANNEL_ID=channel_id_for_dashboard
DEFAULT_INBOUND_ID=1
LOG_LEVEL=debug
```

### Step 4: Create Discord Channels

In your Discord server, create these channels:
- `#admin-review` - For payment review
- `#billing-dashboard` - For revenue dashboard

Copy their IDs and add to `.env`

### Step 5: Start the Bot

```bash
npm start
```

You should see:
```
Connected to SQLite database
Database initialized
Loaded command: order
Loaded command: admin
Loaded event: ready
Loaded event: interactionCreate
Loaded event: channelDelete
Button handlers registered
Bot logged in as YourBot#0000
3x-ui authentication successful
Admin review channel verified: admin-review
Billing dashboard channel verified: billing-dashboard
Slash commands registered
Dashboard message created
Scheduled tasks initialized
Message cleanup service started
Bot started successfully
```

## Testing the Bot

### Test Order Flow

1. In Discord, type `/order`
2. Select a plan from the dropdown
3. Bot creates a private ticket channel
4. Select a payment method
5. Upload a test image as payment screenshot
6. Go to `#admin-review` channel
7. Click "Approve" button
8. Confirm the action
9. Check your DMs for VLESS link

### Test Admin Commands

```
/admin user-create discord_id:123456789 plan_name:Basic duration_days:30 traffic_gb:50
/admin user-info discord_id:123456789
/admin user-disable discord_id:123456789
/admin user-enable discord_id:123456789
/admin user-edit-traffic discord_id:123456789 new_traffic_gb:100
```

### Test Dashboard

1. Go to `#billing-dashboard` channel
2. Click "Refresh" button to update revenue data
3. Click "Export CSV" to download order data
4. Click "DB Backup" for database backup

## Development Tips

### Enable Debug Logging

Set in `.env`:
```
LOG_LEVEL=debug
```

### Watch Mode

For automatic restart on file changes:
```bash
npm run dev
```

### Database Inspection

View SQLite database:
```bash
# Install sqlite3 CLI if needed
sqlite3 data/bot.db

# View tables
.tables

# View schema
.schema users

# Query data
SELECT * FROM orders;
```

### View Logs

```bash
# Real-time logs
tail -f logs/bot.log

# Error logs
tail -f logs/error.log

# Search logs
grep "error" logs/bot.log
```

## Troubleshooting

### Bot not responding to commands

1. Check bot has "Send Messages" permission in channel
2. Verify bot is in the server
3. Check logs for errors: `tail -f logs/error.log`
4. Restart bot: `npm start`

### Database errors

```bash
# Check database file exists
ls -la data/bot.db

# Reset database (WARNING: deletes all data)
rm data/bot.db
npm start
```

### 3x-ui connection failed

```bash
# Test 3x-ui connectivity
curl http://127.0.0.1:2053/panel/api/server

# Check 3x-ui is running
# Verify credentials in .env
```

### Discord API errors

1. Verify bot token is correct
2. Verify guild ID is correct
3. Check bot has required permissions
4. Check rate limiting (wait a few minutes)

## Project Structure

```
bot/
├── src/
│   ├── bot.js                 # Main entry point
│   ├── commands/              # Slash commands
│   │   ├── order.js
│   │   └── admin.js
│   ├── events/                # Discord events
│   │   ├── ready.js
│   │   ├── interactionCreate.js
│   │   └── channelDelete.js
│   ├── handlers/              # Business logic
│   │   ├── payment.js
│   │   ├── admin_review.js
│   │   └── dashboard.js
│   ├── services/              # Core services
│   │   ├── xray_client.js
│   │   ├── health_monitor.js
│   │   ├── revenue_service.js
│   │   └── message_cleanup.js
│   ├── middleware/            # Auth & validation
│   │   ├── auth.js
│   │   └── rate_limit.js
│   ├── models/                # Database
│   │   └── database.js
│   └── utils/                 # Helpers
│       ├── logger.js
│       └── helpers.js
├── config/                    # Configuration
│   ├── plans.json
│   └── payment_methods.json
├── data/                      # Database files
├── logs/                      # Log files
├── package.json
├── .env                       # Environment variables
└── README.md
```

## Next Steps

1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
2. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
3. Customize plans in `config/plans.json`
4. Customize payment methods in `config/payment_methods.json`
5. Set up 3x-ui panel integration
6. Deploy to production server

## Support

For issues or questions:
1. Check logs: `tail -f logs/bot.log`
2. Review error messages
3. Check Discord permissions
4. Verify 3x-ui connectivity
5. Contact development team
