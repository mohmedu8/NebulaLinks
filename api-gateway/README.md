# NebulaLinks API Gateway

A secure API Gateway for 3x-ui VPN panel integration with HMAC authentication.

## Features

- 🔐 HMAC-SHA256 authentication
- ⏱️ Timestamp validation (replay attack prevention)
- 🔒 IP whitelist enforcement
- 🚀 Rate limiting (100 req/min)
- 🔄 Automatic retry with exponential backoff
- 📝 Comprehensive logging
- 🏥 Health monitoring

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
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

4. Generate SSL certificate (self-signed):
```bash
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

5. Start the gateway:
```bash
npm start
```

## Development

Run with auto-reload:
```bash
npm run dev
```

## API Endpoints

All endpoints require HMAC authentication headers:
- `X-API-KEY` - API key
- `X-TIMESTAMP` - Unix timestamp (milliseconds)
- `X-SIGNATURE` - HMAC-SHA256 signature

### VPN Management

**POST /api/vpn/create**
- Create new VPN account
- Body: `{ userId, duration, traffic, serverId, inboundId, email, uuid }`

**POST /api/vpn/extend**
- Extend account expiry
- Body: `{ uuid, additionalDays, inboundId, clientId }`

**POST /api/vpn/add-traffic**
- Add traffic to account
- Body: `{ uuid, additionalGB, inboundId, clientId }`

**POST /api/vpn/disable**
- Disable account
- Body: `{ uuid, inboundId, clientId }`

**POST /api/vpn/delete**
- Delete account
- Body: `{ uuid, inboundId, clientId }`

**GET /api/vpn/stats/:email**
- Get account statistics
- Query: `?inboundId=id`

**GET /api/health**
- Health check endpoint

## Security

- HTTPS only (self-signed or Let's Encrypt)
- Bound to 127.0.0.1 (localhost)
- IP whitelist validation
- Rate limiting
- Constant-time signature comparison
- Timestamp window validation (5 minutes)

## 3x-ui Integration

The gateway communicates with 3x-ui panel via:
- `/login` - Authentication
- `/panel/api/inbounds/addClient` - Create client
- `/panel/api/inbounds/updateClient/:id` - Update client
- `/panel/api/inbounds/delClient/:id` - Delete client
- `/panel/api/inbounds/getClientTraffics/:email` - Get stats

## Logging

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Errors only
- Console output

## Deployment

See deployment guide in the main project README.
