# Quick Start Guide

## 5-Minute Setup (Development)

### Prerequisites
- Node.js 18+
- Discord Bot Token
- 3x-ui server access

### Step 1: Clone and Install

```bash
# Clone repository
git clone <repo-url>
cd NebulaLinksa

# Install Discord Bot
cd discord-bot
npm install
cp .env.example .env

# Install API Gateway
cd ../api-gateway
npm install
cp .env.example .env
```

### Step 2: Configure Environment

**discord-bot/.env:**
```
DISCORD_TOKEN=your-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-guild-id
API_GATEWAY_URL=https://localhost:8443
API_SECRET_KEY=dev-secret-key
ADMIN_ROLE_ID=your-admin-role-id
REVIEW_CHANNEL_ID=your-review-channel-id
BILLING_CHANNEL_ID=your-billing-channel-id
MAIN_PANEL_CHANNEL_ID=your-main-panel-channel-id
```

**api-gateway/.env:**
```
PORT=8443
API_SECRET_KEY=dev-secret-key
PANEL_URL=http://127.0.0.1:2053
PANEL_USERNAME=admin
PANEL_PASSWORD=password
ALLOWED_IPS=127.0.0.1
SSL_CERT_PATH=./cert.pem
SSL_KEY_PATH=./key.pem
```

### Step 3: Generate SSL Certificate

```bash
cd api-gateway
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

### Step 4: Start Services

**Terminal 1 - API Gateway:**
```bash
cd api-gateway
npm run dev
```

**Terminal 2 - Discord Bot:**
```bash
cd discord-bot
npm run dev
```

### Step 5: Initialize Bot

In Discord:
```
/admin setup
/admin plan create name:"Test Plan" duration:30 traffic:100 price:150
/admin server add name:"Test Server" endpoint:"https://localhost:8443" inbound:1 capacity:100
```

## Project Structure Overview

```
discord-bot/
├── src/
│   ├── index.js              # Entry point
│   ├── commands/             # Slash commands
│   ├── events/               # Discord events
│   ├── interactions/         # Button/modal handlers
│   ├── services/             # Business logic
│   ├── database/             # Database setup
│   ├── jobs/                 # Background jobs
│   └── utils/                # Helpers
├── data/                     # SQLite database
├── logs/                     # Log files
└── package.json

api-gateway/
├── src/
│   ├── index.js              # Entry point
│   ├── routes/               # API endpoints
│   ├── middleware/           # Auth, error handling
│   ├── services/             # 3x-ui integration
│   └── utils/                # Helpers
├── logs/                     # Log files
└── package.json
```

## Key Files to Know

### Discord Bot

- **src/index.js** - Main entry point, initializes bot and jobs
- **src/services/database.js** - Database operations
- **src/services/apiClient.js** - API Gateway communication
- **src/events/interactionCreate.js** - Routes interactions to handlers
- **src/jobs/expiryChecker.js** - Expires old accounts

### API Gateway

- **src/index.js** - Server setup and middleware
- **src/middleware/hmacAuth.js** - Authentication
- **src/services/xuiService.js** - 3x-ui communication
- **src/routes/vpn.js** - VPN endpoints

## Common Tasks

### Create a Subscription Plan

```bash
# In Discord
/admin plan create
  name: "30 Days - 100GB"
  duration: 30
  traffic: 100
  price: 150
```

### Add a Server

```bash
# In Discord
/admin server add
  name: "Server 1"
  endpoint: "https://localhost:8443"
  inbound: 1
  capacity: 100
```

### View Statistics

```bash
# In Discord
/admin stats
```

### Test Order Flow

1. Click "Buy Access" button
2. Select a plan
3. Choose payment method
4. Upload a screenshot
5. Admin approves order
6. Check if VPN account created

## Debugging

### View Bot Logs

```bash
# Terminal where bot is running
# Logs appear in real-time

# Or check log file
tail -f discord-bot/logs/combined.log
```

### View API Gateway Logs

```bash
# Terminal where gateway is running
# Logs appear in real-time

# Or check log file
tail -f api-gateway/logs/combined.log
```

### Test API Endpoint

```bash
# Generate signature
node -e "
const crypto = require('crypto');
const timestamp = Date.now();
const method = 'GET';
const path = '/api/health';
const body = '';
const secret = 'dev-secret-key';
const canonical = method + path + timestamp + body;
const sig = crypto.createHmac('sha256', secret).update(canonical).digest('hex');
console.log('X-API-KEY: dev-secret-key');
console.log('X-TIMESTAMP: ' + timestamp);
console.log('X-SIGNATURE: ' + sig);
"

# Make request
curl -k -H "X-API-KEY: dev-secret-key" \
  -H "X-TIMESTAMP: $(date +%s)000" \
  -H "X-SIGNATURE: <signature>" \
  https://localhost:8443/api/health
```

### Check Database

```bash
# View database schema
sqlite3 discord-bot/data/bot.db ".schema"

# Query users
sqlite3 discord-bot/data/bot.db "SELECT * FROM users;"

# Query orders
sqlite3 discord-bot/data/bot.db "SELECT * FROM orders;"
```

## Troubleshooting

### Bot not responding to commands

1. Check bot is running: `npm run dev`
2. Check logs for errors
3. Verify bot has permissions in Discord
4. Verify bot is in the guild

### API Gateway connection failed

1. Check gateway is running: `npm run dev`
2. Check SSL certificate exists
3. Check ALLOWED_IPS includes bot server
4. Check firewall allows port 8443

### Database errors

1. Check data directory exists: `mkdir -p data`
2. Check database file permissions
3. Try deleting and reinitializing: `rm data/bot.db && npm run migrate`

### Payment method not showing

1. Check payments.json is valid JSON
2. Check payment method names match database
3. Restart bot after changes

## Next Steps

1. **Read Full Documentation**
   - See README.md for complete overview
   - See DEPLOYMENT.md for production setup
   - See CONFIGURATION.md for detailed config

2. **Customize**
   - Update payment wallet numbers
   - Create subscription plans
   - Add your servers
   - Customize messages and embeds

3. **Deploy**
   - Follow DEPLOYMENT.md guide
   - Set up SSL certificates
   - Configure firewall
   - Set up monitoring

4. **Monitor**
   - Check logs regularly
   - Review audit trail
   - Monitor performance
   - Update as needed

## Support Resources

- **Discord.js Documentation**: https://discord.js.org
- **Express Documentation**: https://expressjs.com
- **SQLite Documentation**: https://www.sqlite.org
- **3x-ui Documentation**: Check your 3x-ui panel

## Tips & Tricks

### Enable Debug Mode

```bash
# Set in .env
LOG_LEVEL=debug
```

### Faster Development

```bash
# Use npm run dev for auto-reload
npm run dev
```

### Database Backup

```bash
# Backup database
cp discord-bot/data/bot.db discord-bot/data/bot.db.backup
```

### Clear Logs

```bash
# Clear log files
rm discord-bot/logs/*.log
rm api-gateway/logs/*.log
```

### Reset Database

```bash
# Delete and reinitialize
rm discord-bot/data/bot.db
npm run migrate
```

## Performance Tips

1. **Database**: Run `ANALYZE; VACUUM;` periodically
2. **Memory**: Monitor with `ps aux | grep node`
3. **Logs**: Rotate logs to prevent disk fill
4. **Rate Limiting**: Adjust based on load

## Security Reminders

- ✅ Never commit .env files
- ✅ Use strong API secret keys
- ✅ Keep SSL certificates updated
- ✅ Review audit logs regularly
- ✅ Update dependencies: `npm update`
- ✅ Use HTTPS in production
- ✅ Restrict API access by IP

Happy coding! 🚀
