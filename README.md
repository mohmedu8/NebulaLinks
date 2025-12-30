# NebulaLinks VPN Sales System

A production-grade Discord bot system for VPN access sales with secure 3x-ui panel integration.

## 🏗️ Architecture

The system consists of two independent services:

1. **Discord Bot** (Node.js + discord.js v14)
   - Handles user interactions and order management
   - Manages database and business logic
   - Can be hosted anywhere

2. **API Gateway** (Node.js + Express)
   - Runs on 3x-ui server (localhost only)
   - Provides HMAC-authenticated REST API
   - Communicates with 3x-ui panel
   - Keeps panel unexposed to internet

## 📋 Features

- 🛒 Complete order management system
- 💳 Multiple Egyptian payment methods (Vodafone, Orange, Etisalat, WE, Instapay)
- 🔐 HMAC-SHA256 authentication
- 📊 Real-time analytics and billing
- 🔄 Automatic account expiry and renewal
- 📈 Traffic monitoring with alerts
- 👥 Admin review system for payments
- 🎯 Load balancing across multiple servers
- 📝 Comprehensive audit logging
- 🏥 Health monitoring and alerts

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Discord Bot Token
- 3x-ui panel access
- SSL certificate (self-signed or Let's Encrypt)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd NebulaLinksa
```

2. Set up Discord Bot:
```bash
cd discord-bot
npm install
cp .env.example .env
# Edit .env with your configuration
npm run migrate
npm start
```

3. Set up API Gateway (on 3x-ui server):
```bash
cd api-gateway
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

## 📁 Project Structure

```
NebulaLinksa/
├── discord-bot/
│   ├── src/
│   │   ├── commands/          # Slash commands
│   │   ├── events/            # Discord events
│   │   ├── interactions/      # Button/modal handlers
│   │   ├── services/          # Business logic
│   │   ├── database/          # DB initialization
│   │   ├── jobs/              # Background jobs
│   │   ├── utils/             # Utilities
│   │   ├── config/            # Configuration
│   │   └── index.js           # Entry point
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
└── api-gateway/
    ├── src/
    │   ├── routes/            # API endpoints
    │   ├── middleware/        # Auth, error handling
    │   ├── services/          # 3x-ui integration
    │   ├── utils/             # Utilities
    │   ├── config/            # Configuration
    │   └── index.js           # Entry point
    ├── package.json
    ├── .env.example
    └── README.md
```

## 🗄️ Database Schema

### Core Tables

**users**
- Discord user information
- Account status tracking

**orders**
- Order details and status
- Payment information
- Admin review tracking

**vpn_accounts**
- Active VPN accounts
- Expiry and traffic limits
- Server assignment

**servers**
- 3x-ui server information
- Load balancing data
- Status tracking

**plans**
- Subscription plans
- Pricing and features

**audit_logs**
- All transactions logged
- Admin actions tracked
- Compliance records

**revenue_snapshots**
- Daily statistics
- Revenue tracking
- User metrics

## 🔐 Security Features

- ✅ HMAC-SHA256 authentication
- ✅ Timestamp validation (5-minute window)
- ✅ Constant-time signature comparison
- ✅ IP whitelist enforcement
- ✅ HTTPS encryption
- ✅ Environment variables for secrets
- ✅ Rate limiting (100 req/min)
- ✅ Ephemeral messages for sensitive data
- ✅ Comprehensive audit logging
- ✅ 3x-ui panel bound to localhost

## 🔄 User Flow

1. User clicks "Buy Access" in Discord
2. Selects subscription plan
3. Private order channel created
4. Selects payment method
5. Receives payment instructions
6. Uploads payment screenshot
7. Admin reviews and approves
8. VPN account created automatically
9. User receives VLESS link and config
10. Account active until expiry

## 👨‍💼 Admin Features

- Order review and approval/decline
- Plan management
- Server management
- Real-time statistics
- Export data (CSV/JSON)
- Audit log viewing
- User management
- Manual account operations

## 🔧 Configuration

### Discord Bot (.env)

```
DISCORD_TOKEN=your-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_GUILD_ID=your-guild-id
API_GATEWAY_URL=https://your-server.com:8443
API_SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:./data/bot.db
ADMIN_ROLE_ID=your-admin-role-id
REVIEW_CHANNEL_ID=your-review-channel-id
BILLING_CHANNEL_ID=your-billing-channel-id
MAIN_PANEL_CHANNEL_ID=your-main-panel-channel-id
```

### API Gateway (.env)

```
PORT=8443
API_SECRET_KEY=your-secret-key
PANEL_URL=http://127.0.0.1:2053
PANEL_USERNAME=admin
PANEL_PASSWORD=password
ALLOWED_IPS=bot-server-ip
SSL_CERT_PATH=/path/to/cert.pem
SSL_KEY_PATH=/path/to/key.pem
```

## 📊 Background Jobs

| Job | Frequency | Purpose |
|-----|-----------|---------|
| Expiry Checker | Hourly | Disable expired accounts |
| Traffic Monitor | Every 6 hours | Monitor usage, suspend if limit reached |
| Order Timeout | Every 30 minutes | Expire unpaid orders after 24h |
| Health Check | Every 5 minutes | Monitor API Gateway connectivity |

## 🚢 Deployment

### Discord Bot Deployment

1. Set up hosting (VPS, cloud platform)
2. Install Node.js 18+
3. Install PM2: `npm install -g pm2`
4. Clone repository and install dependencies
5. Configure `.env` file
6. Run migrations: `npm run migrate`
7. Start with PM2: `pm2 start src/index.js --name nebulalinks-bot`
8. Configure PM2 startup: `pm2 startup`
9. Save PM2 config: `pm2 save`

### API Gateway Deployment

1. SSH into 3x-ui server
2. Install Node.js 18+
3. Clone repository and install dependencies
4. Generate SSL certificate:
   ```bash
   openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
   ```
5. Configure `.env` file
6. Start with PM2: `pm2 start src/index.js --name xui-gateway`
7. Configure firewall (only allow bot server IP on port 8443)

### Discord Bot Setup

1. Create application at https://discord.com/developers
2. Enable required intents:
   - Server Members
   - Message Content
3. Generate bot token
4. Create invite URL with permissions:
   - Manage Channels
   - Manage Messages
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Use Slash Commands
5. Invite bot to server
6. Create required channels:
   - Main panel channel
   - Review channel
   - Billing channel
7. Create admin role and assign to staff
8. Configure channel IDs in `.env`

## 📝 Post-Deployment

1. Run `/admin setup` to initialize panels
2. Create subscription plans with `/admin plan create`
3. Add servers with `/admin server add`
4. Update payment wallet numbers in config
5. Assign admin roles to staff
6. Process first few orders manually to verify flow
7. Monitor logs and audit trail

## 🧪 Testing Checklist

- [ ] Main panel displays correctly
- [ ] Buy flow creates order channel
- [ ] Payment method selection works
- [ ] Screenshot upload triggers review
- [ ] Admin approval creates VPN account
- [ ] User receives config
- [ ] My Account shows correct info
- [ ] Renewal flow works
- [ ] Expiry checker disables accounts
- [ ] Traffic monitor alerts users
- [ ] Health check detects failures

## 📞 Support

For issues or questions:
1. Check logs: `logs/combined.log`
2. Review audit logs in Discord
3. Check API Gateway health: `GET /api/health`
4. Verify database connectivity

## 📄 License

Proprietary - NebulaLinks

## 🔗 Related Documentation

- [Discord Bot README](./discord-bot/README.md)
- [API Gateway README](./api-gateway/README.md)
- [Database Schema](./docs/schema.md)
- [API Reference](./docs/api.md)
