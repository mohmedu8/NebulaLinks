# Architecture Documentation

## System Overview

The VPN Discord Bot is a modular system for managing VPN service orders through Discord, with integration to 3x-ui panel for client management.

## Core Components

### 1. Discord Bot Core (`src/bot.js`)
- Initializes Discord client with required intents
- Loads commands and event handlers
- Manages slash command registration
- Orchestrates service initialization
- Handles graceful shutdown

### 2. Database Layer (`src/models/database.js`)
- SQLite database abstraction
- Schema initialization with all required tables
- Promise-based query interface
- Connection pooling and error handling

### 3. 3x-ui API Client (`src/services/xray_client.js`)
- REST API wrapper for 3x-ui panel
- Client lifecycle management (create, update, delete)
- Traffic statistics retrieval
- VLESS link generation
- Session management with authentication

### 4. Authentication & Authorization (`src/middleware/auth.js`)
- Role-based access control (Owner, Admin, Support)
- Whitelist verification
- Admin session management with 5-minute expiry
- One-time use session tokens
- Audit logging for all sensitive actions

### 5. Rate Limiting (`src/middleware/rate_limit.js`)
- Per-user, per-command rate limiting
- In-memory counter with TTL
- Configurable limits per command type

### 6. Health Monitoring (`src/services/health_monitor.js`)
- Periodic 3x-ui panel health checks
- Consecutive failure tracking
- Automatic status change notifications
- Circuit breaker pattern implementation

### 7. Revenue Service (`src/services/revenue_service.js`)
- Financial data aggregation
- Period-based revenue calculation (day, month, quarter, year)
- Cache management for dashboard
- Order statistics tracking

### 8. Message Cleanup (`src/services/message_cleanup.js`)
- Automatic message deletion based on TTL
- Orphaned channel cleanup
- Ticket channel lifecycle management
- Scheduled cleanup tasks

## Data Flow

### Order Creation Flow
```
User: /order command
  ↓
Bot: Check existing active orders
  ↓
Bot: Display plan selection (ephemeral)
  ↓
User: Select plan
  ↓
Bot: Create private ticket channel
  ↓
Bot: Create order record (status: pending_payment)
  ↓
Bot: Display payment method selection
  ↓
User: Select payment method
  ↓
Bot: Display payment instructions
  ↓
User: Upload screenshot
  ↓
Bot: Validate image & calculate hash
  ↓
Bot: Check for duplicate screenshots
  ↓
Bot: Lock channel (remove user send permission)
  ↓
Bot: Create payment record (status: pending)
  ↓
Bot: Send to admin review channel
```

### Payment Approval Flow
```
Admin: Click Approve button
  ↓
Bot: Create session token (5 min expiry)
  ↓
Bot: Send confirmation message (ephemeral)
  ↓
Admin: Click Confirm
  ↓
Bot: Validate session (not expired, not consumed)
  ↓
Bot: Check 3x-ui health
  ↓
Bot: Create client in 3x-ui
  ↓
Bot: Generate VLESS link
  ↓
Bot: Update database (users, orders, payments)
  ↓
Bot: Update revenue cache
  ↓
Bot: Send VLESS link to user (DM)
  ↓
Bot: Update admin review message
  ↓
Bot: Schedule channel deletion (24h)
  ↓
Bot: Log audit trail
```

## Database Schema

### users
- Stores user account information
- Links Discord ID to 3x-ui UUID
- Tracks VPN status and expiry
- Indexed on discord_id for fast lookups

### orders
- Order records with plan details
- Links to ticket channels
- Status tracking (pending_payment → completed)
- Timestamps for audit trail

### payments
- Payment submission records
- Screenshot URL and SHA256 hash
- Review status and admin notes
- Duplicate detection via hash

### revenue_cache
- Aggregated financial data
- Period-based calculations
- Updated every 5 minutes
- Supports day/month/quarter/year views

### audit_logs
- Immutable action log
- Admin ID, action type, target
- Full action payload (JSON)
- Indexed on admin_id and timestamp

### admin_sessions
- Temporary session tokens
- 5-minute expiry
- One-time use flag
- Action payload storage

### bot_config
- Key-value configuration storage
- Dashboard message ID persistence
- Bot state management

### bot_messages
- Message tracking for cleanup
- TTL-based deletion
- Channel and message ID mapping

## Security Architecture

### Authentication Layers
1. **Discord Role Verification**: Check user roles in guild
2. **Whitelist Verification**: Verify Discord ID in OWNER/ADMIN lists
3. **Session Validation**: Verify session token exists, not expired, not consumed
4. **Action Verification**: Confirm action type matches session payload

### Data Protection
- Sensitive data in ephemeral messages (auto-delete)
- Private ticket channels (user + admins only)
- Screenshot hash for duplicate detection
- Database transactions for multi-step operations

### Audit Trail
- All admin actions logged with timestamp
- Admin ID and action details recorded
- Session token stored for traceability
- Immutable audit log table

### Rate Limiting
- Per-user command limits
- Per-minute windows
- Configurable thresholds
- Automatic cleanup of expired counters

## Event Handlers

### ready
- Bot startup initialization
- 3x-ui authentication
- Health monitor startup
- Channel verification

### interactionCreate
- Slash command routing
- Button interaction handling
- Select menu routing
- Error handling and logging

### channelDelete
- Cleanup order records
- Remove bot message references
- Update database state

## Scheduled Tasks

| Task | Interval | Purpose |
|------|----------|---------|
| Revenue Cache Update | 5 minutes | Aggregate financial data |
| Dashboard Refresh | 5 minutes | Update revenue display |
| Session Cleanup | 10 minutes | Remove expired sessions |
| Rate Limiter Cleanup | 5 minutes | Remove expired counters |
| Message Cleanup | 30 minutes | Delete expired messages |

## Error Handling

### Graceful Degradation
- Revenue cache failure: Log error, continue
- Audit log failure: Log to file system as backup
- Message deletion failure: Continue cleanup process
- 3x-ui unavailable: Reject new orders, alert owner

### Rollback Mechanism
- Database transactions for multi-step operations
- Attempt to delete created 3x-ui client on failure
- Revert database changes on error
- Unlock ticket channel on failure

### Health Monitoring
- 3x-ui health checks every 60 seconds
- 3 consecutive failures trigger alert
- Owner notified via DM when panel down
- New orders rejected during outage

## Performance Considerations

### Database Optimization
- Indexed columns: discord_id, order_id, admin_id, timestamp
- Efficient queries with proper WHERE clauses
- Batch operations where possible
- Connection pooling for concurrent requests

### Caching Strategy
- Revenue data cached in database
- 5-minute update interval
- Reduces query load on dashboard
- Supports historical data queries

### Message Cleanup
- Batch deletion (max 100 messages)
- 30-minute cleanup interval
- Prevents message accumulation
- Automatic orphaned record cleanup

## Deployment Architecture

### Service Structure
- Single Node.js process
- Systemd service management
- Automatic restart on failure
- Journal logging integration

### Data Persistence
- SQLite database in `/data` directory
- Backup capability via export
- Automatic schema initialization
- Migration support for future updates

### Logging
- Structured JSON logging
- Separate error and general logs
- Console output for development
- File rotation support

## Extensibility

### Adding New Commands
1. Create file in `src/commands/`
2. Export SlashCommandBuilder and execute function
3. Auto-loaded by bot initialization

### Adding New Event Handlers
1. Create file in `src/events/`
2. Export name, once flag, and execute function
3. Auto-loaded by bot initialization

### Adding New Services
1. Create file in `src/services/`
2. Implement service class
3. Initialize in bot.js startup

### Adding New Middleware
1. Create file in `src/middleware/`
2. Export middleware functions
3. Use in command/handler execution
