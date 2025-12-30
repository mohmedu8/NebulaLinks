# VPN Discord Bot

A Discord bot for managing VPN service orders and payments integrated with 3x-ui panel.

## Features

- **User Order Flow**: Users can create orders, select plans, and submit payments
- **Payment Review System**: Admins review and approve/decline payments with double-confirmation
- **3x-ui Integration**: Automatic client creation and VLESS link generation
- **Revenue Dashboard**: Real-time financial overview for owners
- **Admin Management**: Commands to create, disable, enable users and edit traffic
- **Security**: Role-based access control, session tokens, rate limiting, duplicate detection
- **Audit Logging**: Comprehensive audit trail of all admin actions
- **Health Monitoring**: Automatic detection of 3x-ui panel unavailability

## Prerequisites

- Node.js 18+
- Discord Bot Token
- 3x-ui Panel (accessible on localhost:2053)
- SQLite3 (included with Node.js)

## Installation

1. Clone the repository:
```bash
cd bot
npm install
```

2. Create `.env` file with required variables:
```
DISCORD_BOT_TOKEN=your_token
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
```

3. Start the bot:
```bash
npm start
```

## Commands

### User Commands
- `/order` - Create a new VPN order

### Admin Commands
- `/admin user-create` - Create a user directly
- `/admin user-disable` - Disable a user
- `/admin user-enable` - Enable a user
- `/admin user-edit-traffic` - Edit user traffic limit
- `/admin user-info` - Get user information

## Architecture

### Services
- **XrayClient**: 3x-ui API wrapper
- **HealthMonitor**: Panel health checking
- **RevenueService**: Financial data aggregation
- **MessageCleanup**: Automatic message and channel cleanup

### Middleware
- **AuthMiddleware**: Role verification, session management
- **RateLimiter**: Command rate limiting

### Handlers
- **Payment**: Screenshot upload and validation
- **AdminReview**: Payment approval/decline workflow
- **Dashboard**: Revenue dashboard management

## Security Features

- ✅ Localhost-only 3x-ui API access
- ✅ Double-confirmation for admin actions
- ✅ Session tokens with 5-minute expiry
- ✅ Rate limiting on all commands
- ✅ Duplicate screenshot detection via SHA256
- ✅ Private ticket channels
- ✅ Ephemeral messages for sensitive data
- ✅ Comprehensive audit logging
- ✅ Database transactions for multi-step operations

## Database Schema

### Tables
- `users` - User accounts and VPN status
- `orders` - Order records
- `payments` - Payment submissions and reviews
- `revenue_cache` - Aggregated financial data
- `audit_logs` - Admin action logs
- `admin_sessions` - Temporary session tokens
- `bot_config` - Bot configuration
- `bot_messages` - Message tracking for cleanup

## Deployment

### Systemd Service

Create `/etc/systemd/system/vpn-bot.service`:
```ini
[Unit]
Description=VPN Discord Bot
After=network.target

[Service]
Type=simple
User=vpnbot
WorkingDirectory=/opt/vpn-bot
ExecStart=/usr/bin/node src/bot.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable vpn-bot
sudo systemctl start vpn-bot
```

## Logging

Logs are stored in `/logs` directory:
- `bot.log` - General bot logs
- `error.log` - Error logs

## Support

For issues or questions, contact the development team.
