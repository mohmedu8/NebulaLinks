# Screenshot Upload Fix

## Issue
Error: `response.buffer is not a function` when uploading screenshots

## Fix
In `/home/vpnbot/vpn-bot/bot/src/bot.js`, line ~241, change:

```javascript
const buffer = await response.buffer();
```

To:

```javascript
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
```

## Full Context
Replace this section:
```javascript
const crypto = await import('crypto');
const response = await fetch(attachment.url);
const buffer = await response.buffer();
const hash = crypto.default.createHash('sha256').update(buffer).digest('hex');
```

With:
```javascript
const crypto = await import('crypto');
const response = await fetch(attachment.url);
const arrayBuffer = await response.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);
const hash = crypto.default.createHash('sha256').update(buffer).digest('hex');
```

## After Fix
1. Save the file
2. Restart the bot: `sudo systemctl restart vpn-bot`
3. Test by uploading a screenshot to a ticket channel

The bot should now properly capture and hash screenshots without errors.
