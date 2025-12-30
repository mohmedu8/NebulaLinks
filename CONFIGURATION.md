# NebulaLinks Configuration Template

## Discord Bot Configuration

### Environment Variables (.env)

```
# Discord Bot Token
DISCORD_TOKEN=your-bot-token-here

# Discord Application ID
DISCORD_CLIENT_ID=your-client-id-here

# Discord Guild/Server ID
DISCORD_GUILD_ID=your-guild-id-here

# API Gateway Configuration
API_GATEWAY_URL=https://your-xui-server.com:8443
API_SECRET_KEY=your-secret-key-here

# Database Configuration
DATABASE_URL=sqlite:./data/bot.db

# Discord Role IDs
ADMIN_ROLE_ID=your-admin-role-id

# Discord Channel IDs
REVIEW_CHANNEL_ID=your-review-channel-id
BILLING_CHANNEL_ID=your-billing-channel-id
MAIN_PANEL_CHANNEL_ID=your-main-panel-channel-id

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

## API Gateway Configuration

### Environment Variables (.env)

```
# Server Configuration
PORT=8443
NODE_ENV=production

# API Authentication
API_SECRET_KEY=your-secret-key-here

# 3x-ui Panel Configuration
PANEL_URL=http://127.0.0.1:2053
PANEL_USERNAME=admin
PANEL_PASSWORD=your-panel-password

# Security
ALLOWED_IPS=bot-server-ip-address

# SSL Certificate Paths
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem

# Logging
LOG_LEVEL=info
```

## Payment Methods Configuration

### File: discord-bot/src/config/payments.json

```json
{
  "VODAFONE": {
    "name": "Vodafone Cash",
    "wallet": "01XXXXXXXXX",
    "receiver": "Your Business Name",
    "instructions": "Send to Vodafone Cash wallet"
  },
  "ORANGE": {
    "name": "Orange Cash",
    "wallet": "01XXXXXXXXX",
    "receiver": "Your Business Name",
    "instructions": "Send to Orange Cash wallet"
  },
  "ETISALAT": {
    "name": "Etisalat Cash",
    "wallet": "01XXXXXXXXX",
    "receiver": "Your Business Name",
    "instructions": "Send to Etisalat Cash wallet"
  },
  "WE": {
    "name": "WE Cash",
    "wallet": "01XXXXXXXXX",
    "receiver": "Your Business Name",
    "instructions": "Send to WE Cash wallet"
  },
  "INSTAPAY": {
    "name": "Instapay",
    "account": "01XXXXXXXXX",
    "receiver": "Your Business Name",
    "instructions": "Send via Instapay to account"
  }
}
```

## Initial Setup Steps

### 1. Discord Application Setup

1. Go to https://discord.com/developers/applications
2. Create new application "NebulaLinks"
3. Go to Bot section and create bot
4. Copy token to DISCORD_TOKEN
5. Go to OAuth2 → General
6. Copy Client ID to DISCORD_CLIENT_ID
7. Go to OAuth2 → URL Generator
8. Select bot scope and required permissions
9. Copy generated URL and invite bot to server

### 2. Discord Server Setup

1. Create channels:
   - `#vpn-panel` (Main panel)
   - `#order-review` (Admin review)
   - `#billing-stats` (Statistics)

2. Create role:
   - `VPN Admin` (for staff)

3. Get IDs:
   - Right-click channel → Copy Channel ID
   - Right-click role → Copy Role ID

### 3. 3x-ui Server Setup

1. SSH into 3x-ui server
2. Get 3x-ui panel URL (usually http://127.0.0.1:2053)
3. Get admin credentials
4. Get inbound IDs from panel

### 4. Generate API Secret Key

```bash
# Generate random secret key
openssl rand -hex 32
```

### 5. Generate SSL Certificate

```bash
# Self-signed certificate (valid 1 year)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Or use Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com
```

## Subscription Plans Template

Create plans using `/admin plan create`:

### Starter Plan
- Duration: 7 days
- Traffic: 50 GB
- Price: 50 EGP

### Standard Plan
- Duration: 30 days
- Traffic: 100 GB
- Price: 150 EGP

### Premium Plan
- Duration: 30 days
- Traffic: 500 GB
- Price: 500 EGP

### Annual Plan
- Duration: 365 days
- Traffic: 1000 GB
- Price: 1500 EGP

## Server Configuration Template

Add servers using `/admin server add`:

### Server 1
- Name: "Egypt Server 1"
- Endpoint: https://your-xui-server.com:8443
- Inbound ID: 1
- Capacity: 100 users

### Server 2
- Name: "Egypt Server 2"
- Endpoint: https://your-xui-server.com:8443
- Inbound ID: 2
- Capacity: 100 users

## Security Configuration

### API Gateway Security

1. **IP Whitelist**: Only allow bot server IP
2. **SSL/TLS**: Use valid certificate
3. **Rate Limiting**: 100 requests/minute per IP
4. **HMAC Authentication**: All requests signed

### Discord Bot Security

1. **Ephemeral Messages**: Sensitive data only visible to user
2. **Audit Logging**: All transactions logged
3. **Admin Verification**: Admin role required for sensitive operations
4. **Environment Variables**: All secrets in .env

## Monitoring Configuration

### PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-auto-pull

# Enable monitoring
pm2 web
```

### Log Rotation

```bash
# Install log rotation
pm2 install pm2-logrotate

# Configure rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 10
```

## Backup Configuration

### Automated Database Backup

```bash
# Add to crontab
0 2 * * * cp /opt/nebulalinks/discord-bot/data/bot.db /backups/bot.db.$(date +\%Y\%m\%d)
```

### Backup Retention

- Keep daily backups for 7 days
- Keep weekly backups for 4 weeks
- Keep monthly backups for 12 months

## Performance Tuning

### Database Optimization

```bash
# Run periodically
sqlite3 discord-bot/data/bot.db "ANALYZE; VACUUM;"
```

### Memory Management

```bash
# Set PM2 memory limit
pm2 start src/index.js --max-memory-restart 500M
```

### Rate Limiting Adjustment

Modify based on expected load:
- Low traffic: 50 requests/minute
- Medium traffic: 100 requests/minute
- High traffic: 200 requests/minute

## Troubleshooting Configuration

### Enable Debug Logging

```
LOG_LEVEL=debug
```

### Increase Timeout Values

```
API_TIMEOUT=30000  # 30 seconds
```

### Enable Verbose Logging

```
VERBOSE_LOGGING=true
```

## Compliance Configuration

### Data Retention

- Orders: Keep indefinitely
- Audit logs: Keep indefinitely
- Declined orders: Anonymize after 30 days
- User data: Delete on request

### GDPR Compliance

- Implement data export functionality
- Implement data deletion functionality
- Maintain audit trail
- Document data processing

## Support Configuration

### Admin Contact

Update in Discord bot:
- Admin role mention in support messages
- Support channel link
- Response time expectations

### FAQ Configuration

Update in bot code:
- Common questions
- Troubleshooting steps
- Contact information
