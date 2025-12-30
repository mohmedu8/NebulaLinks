# NebulaLinks Discord Bot

A production-grade Discord bot for VPN access sales with 3x-ui panel integration.

## Features

- 🛒 Order management with payment verification
- 💳 Multiple Egyptian payment methods support
- 🔐 HMAC-authenticated API Gateway
- 📊 Real-time analytics and billing
- 🔄 Automatic account expiry and renewal
- 📈 Traffic monitoring and alerts
- 👥 Admin review system
- 🎯 Load balancing across multiple servers

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

4. Initialize database:
```bash
npm run migrate
```

5. Start the bot:
```bash
npm start
```

## Development

Run with auto-reload:
```bash
npm run dev
```

## Project Structure

```
src/
├── commands/          # Slash commands
├── events/            # Discord event handlers
├── interactions/      # Button/modal/select menu handlers
├── services/          # Business logic
├── database/          # Database initialization
├── jobs/              # Background jobs
├── utils/             # Utilities
└── config/            # Configuration files
```

## Database

The bot uses SQLite with the following main tables:
- `users` - Discord users
- `orders` - VPN orders
- `vpn_accounts` - Active VPN accounts
- `servers` - 3x-ui servers
- `plans` - Subscription plans
- `audit_logs` - Transaction logs
- `revenue_snapshots` - Daily statistics

## Background Jobs

- **Expiry Checker** (hourly) - Disables expired accounts
- **Traffic Monitor** (every 6 hours) - Monitors traffic usage
- **Order Timeout** (every 30 minutes) - Expires unpaid orders
- **Health Check** (every 5 minutes) - Monitors API Gateway

## Admin Commands

- `/admin setup` - Initialize panels
- `/admin plan create` - Create subscription plan
- `/admin plan list` - List all plans
- `/admin server add` - Add new server
- `/admin server list` - List all servers
- `/admin stats` - View statistics

## Security

- HMAC-SHA256 authentication with API Gateway
- Timestamp validation (5-minute window)
- IP whitelist for API access
- Ephemeral messages for sensitive data
- Audit logging for all transactions
- Environment variables for secrets

## Deployment

See deployment guide in the main project README.
