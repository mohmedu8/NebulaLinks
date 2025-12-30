# Deployment Guide

## Prerequisites

- VPS or cloud server for Discord Bot
- 3x-ui server with SSH access
- Node.js 18+ installed on both servers
- PM2 process manager
- SSL certificate (self-signed or Let's Encrypt)
- Discord application and bot token

## Step 1: Discord Bot Deployment

### 1.1 Server Setup

```bash
# SSH into bot server
ssh user@bot-server.com

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application directory
mkdir -p /opt/nebulalinks
cd /opt/nebulalinks
```

### 1.2 Clone and Install

```bash
# Clone repository
git clone <repo-url> .

# Navigate to bot directory
cd discord-bot

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 1.3 Database Setup

```bash
# Create data directory
mkdir -p data

# Run migrations
npm run migrate
```

### 1.4 Start with PM2

```bash
# Start the bot
pm2 start src/index.js --name nebulalinks-bot

# Configure PM2 to start on boot
pm2 startup
pm2 save

# View logs
pm2 logs nebulalinks-bot
```

## Step 2: API Gateway Deployment

### 2.1 Server Setup

```bash
# SSH into 3x-ui server
ssh user@xui-server.com

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Create application directory
mkdir -p /opt/xui-gateway
cd /opt/xui-gateway
```

### 2.2 Clone and Install

```bash
# Clone repository
git clone <repo-url> .

# Navigate to gateway directory
cd api-gateway

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2.3 SSL Certificate

```bash
# Generate self-signed certificate (valid for 1 year)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Or use Let's Encrypt with Certbot
sudo apt-get install -y certbot
sudo certbot certonly --standalone -d your-domain.com

# Update .env with certificate paths
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

### 2.4 Firewall Configuration

```bash
# Allow only bot server IP on port 8443
sudo ufw allow from BOT_SERVER_IP to any port 8443

# Or use iptables
sudo iptables -A INPUT -p tcp --dport 8443 -s BOT_SERVER_IP -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8443 -j DROP
```

### 2.5 Start with PM2

```bash
# Start the gateway
pm2 start src/index.js --name xui-gateway

# Configure PM2 to start on boot
pm2 startup
pm2 save

# View logs
pm2 logs xui-gateway
```

## Step 3: Discord Bot Configuration

### 3.1 Create Discord Application

1. Go to https://discord.com/developers/applications
2. Click "New Application"
3. Name it "NebulaLinks"
4. Go to "Bot" section
5. Click "Add Bot"
6. Copy the token and add to `.env` as `DISCORD_TOKEN`

### 3.2 Configure Bot Permissions

1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select permissions:
   - Manage Channels
   - Manage Messages
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and invite bot to your server

### 3.3 Create Discord Channels

```
Main Panel Channel (for buy/account buttons)
Review Channel (for admin order review)
Billing Channel (for statistics)
```

### 3.4 Create Admin Role

1. Create a role named "VPN Admin"
2. Assign to staff members
3. Add role ID to `.env` as `ADMIN_ROLE_ID`

### 3.5 Update .env

```bash
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-guild-id
API_GATEWAY_URL=https://xui-server.com:8443
API_SECRET_KEY=your-secret-key
ADMIN_ROLE_ID=your-admin-role-id
REVIEW_CHANNEL_ID=your-review-channel-id
BILLING_CHANNEL_ID=your-billing-channel-id
MAIN_PANEL_CHANNEL_ID=your-main-panel-channel-id
```

## Step 4: Post-Deployment Setup

### 4.1 Initialize Panels

```
In Discord, run: /admin setup
```

### 4.2 Create Subscription Plans

```
/admin plan create
  name: "30 Days - 100GB"
  duration: 30
  traffic: 100
  price: 150
```

### 4.3 Add Servers

```
/admin server add
  name: "Server 1"
  endpoint: https://xui-server.com:8443
  inbound: 1
  capacity: 100
```

### 4.4 Update Payment Methods

Edit `discord-bot/src/config/payments.json` with real wallet numbers:

```json
{
  "VODAFONE": {
    "wallet": "01XXXXXXXXX",
    "receiver": "Your Name"
  },
  ...
}
```

### 4.5 Test the System

1. Click "Buy Access" button
2. Select a plan
3. Choose payment method
4. Upload a test screenshot
5. Admin approves order
6. Verify VPN account is created

## Step 5: Monitoring and Maintenance

### 5.1 Monitor Logs

```bash
# Bot logs
pm2 logs nebulalinks-bot

# Gateway logs
pm2 logs xui-gateway

# View specific log file
tail -f logs/combined.log
```

### 5.2 Check Health

```bash
# Check bot status
pm2 status

# Check API Gateway health
curl -k https://localhost:8443/api/health
```

### 5.3 Backup Database

```bash
# Backup bot database
cp discord-bot/data/bot.db discord-bot/data/bot.db.backup

# Or use cron for automated backups
0 2 * * * cp /opt/nebulalinks/discord-bot/data/bot.db /backups/bot.db.$(date +\%Y\%m\%d)
```

### 5.4 Update Certificates

```bash
# For Let's Encrypt, set up auto-renewal
sudo certbot renew --dry-run

# Restart gateway after renewal
pm2 restart xui-gateway
```

## Troubleshooting

### Bot not responding

```bash
# Check if bot is running
pm2 status

# Restart bot
pm2 restart nebulalinks-bot

# Check logs for errors
pm2 logs nebulalinks-bot --err
```

### API Gateway connection issues

```bash
# Check if gateway is running
pm2 status

# Test connectivity
curl -k https://localhost:8443/api/health

# Check firewall rules
sudo ufw status
```

### Database errors

```bash
# Check database file exists
ls -la discord-bot/data/bot.db

# Verify permissions
chmod 644 discord-bot/data/bot.db

# Backup and reinitialize if corrupted
npm run migrate
```

### SSL certificate issues

```bash
# Verify certificate
openssl x509 -in cert.pem -text -noout

# Check certificate expiry
openssl x509 -in cert.pem -noout -dates
```

## Security Checklist

- [ ] Change default passwords
- [ ] Configure firewall rules
- [ ] Enable SSL/TLS
- [ ] Set strong API secret key
- [ ] Restrict API Gateway to bot server IP only
- [ ] Enable PM2 monitoring
- [ ] Set up log rotation
- [ ] Configure automated backups
- [ ] Review audit logs regularly
- [ ] Update Node.js and dependencies regularly

## Performance Optimization

### 1. Database Optimization

```bash
# Analyze database
sqlite3 discord-bot/data/bot.db "ANALYZE;"

# Vacuum database
sqlite3 discord-bot/data/bot.db "VACUUM;"
```

### 2. PM2 Configuration

```bash
# Increase memory limit
pm2 start src/index.js --max-memory-restart 500M

# Enable clustering (if needed)
pm2 start src/index.js -i max
```

### 3. Rate Limiting

Adjust in `api-gateway/src/index.js`:
```javascript
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100  // Adjust based on load
});
```

## Support

For issues:
1. Check logs: `pm2 logs`
2. Verify configuration: `cat .env`
3. Test connectivity: `curl -k https://localhost:8443/api/health`
4. Review audit logs in Discord
