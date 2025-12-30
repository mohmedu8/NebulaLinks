# Deployment Guide

## Prerequisites

- Ubuntu/Debian server
- Node.js 18+ installed
- 3x-ui panel running on localhost:2053
- Discord bot token and guild ID

## Installation Steps

### 1. Clone and Setup

```bash
# Create bot user
sudo useradd -m -s /bin/bash vpnbot

# Clone repository
sudo -u vpnbot git clone <repo-url> /opt/vpn-bot
cd /opt/vpn-bot/bot

# Install dependencies
sudo -u vpnbot npm install
```

### 2. Configure Environment

```bash
# Create .env file
sudo -u vpnbot nano .env
```

Add the following variables:
```
DISCORD_BOT_TOKEN=your_token_here
DISCORD_GUILD_ID=your_guild_id
OWNER_DISCORD_IDS=owner_id_1,owner_id_2
ADMIN_DISCORD_IDS=admin_id_1,admin_id_2
XRAY_API_URL=http://127.0.0.1:2053
XRAY_API_USERNAME=admin
XRAY_API_PASSWORD=admin
DATABASE_URL=sqlite:///data/bot.db
ADMIN_REVIEW_CHANNEL_ID=channel_id
BILLING_DASHBOARD_CHANNEL_ID=channel_id
DEFAULT_INBOUND_ID=1
LOG_LEVEL=info
```

### 3. Create Systemd Service

```bash
sudo nano /etc/systemd/system/vpn-bot.service
```

Add the following content:
```ini
[Unit]
Description=VPN Discord Bot
After=network.target

[Service]
Type=simple
User=vpnbot
WorkingDirectory=/opt/vpn-bot/bot
ExecStart=/usr/bin/node src/bot.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 4. Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service
sudo systemctl enable vpn-bot

# Start service
sudo systemctl start vpn-bot

# Check status
sudo systemctl status vpn-bot

# View logs
sudo journalctl -u vpn-bot -f
```

## Monitoring

### Check Service Status
```bash
sudo systemctl status vpn-bot
```

### View Logs
```bash
# Real-time logs
sudo journalctl -u vpn-bot -f

# Last 100 lines
sudo journalctl -u vpn-bot -n 100

# Logs from last hour
sudo journalctl -u vpn-bot --since "1 hour ago"
```

### Database Backup
```bash
# Backup database
sudo -u vpnbot cp /opt/vpn-bot/bot/data/bot.db /opt/vpn-bot/bot/data/bot.db.backup

# Restore database
sudo -u vpnbot cp /opt/vpn-bot/bot/data/bot.db.backup /opt/vpn-bot/bot/data/bot.db
```

## Troubleshooting

### Bot not starting
```bash
# Check logs
sudo journalctl -u vpn-bot -n 50

# Verify Node.js installation
node --version

# Test bot locally
cd /opt/vpn-bot/bot
npm start
```

### Database errors
```bash
# Check database file permissions
ls -la /opt/vpn-bot/bot/data/

# Fix permissions if needed
sudo chown vpnbot:vpnbot /opt/vpn-bot/bot/data/bot.db
```

### 3x-ui connection issues
```bash
# Test 3x-ui connectivity
curl http://127.0.0.1:2053/panel/api/server

# Check if 3x-ui is running
sudo systemctl status xray
```

## Updates

```bash
# Pull latest changes
cd /opt/vpn-bot
sudo -u vpnbot git pull

# Install new dependencies
cd bot
sudo -u vpnbot npm install

# Restart service
sudo systemctl restart vpn-bot
```

## Uninstall

```bash
# Stop service
sudo systemctl stop vpn-bot

# Disable service
sudo systemctl disable vpn-bot

# Remove service file
sudo rm /etc/systemd/system/vpn-bot.service

# Remove bot directory
sudo rm -rf /opt/vpn-bot

# Remove bot user
sudo userdel -r vpnbot
```
