# Quick Reference: Automatic HUB Loading

## Setup (One-time)

1. Create or edit `.env` file in project root:
   ```env
   HUB1=your-password
   HUB1IP=192.168.1.100
   ```

2. Find your password:
   - Check sticker on back of Plugwise gateway
   - 8-character code (e.g., "glmpttxf")

3. Find your IP address:
   - Check your router's DHCP client list
   - Or use: `arp -a | grep plugwise`

## Usage

### Start Server
```bash
npm start
```

Expected output:
```
Loading HUB configurations from .env...
✓ Loaded HUB1 at 192.168.1.100: Plugwise Gateway (smile)
✓ Loaded 1 hub(s) from .env
🚀 Plugwise MCP Server started!
```

### Check Status
```bash
curl http://localhost:3000/health
```

### Auto-Connect (No Credentials Needed)
```javascript
// Connects to first loaded hub automatically
await mcpClient.callTool('connect', {});
```

### Connect to Specific Hub
```javascript
// Password loaded automatically from .env
await mcpClient.callTool('connect', { host: '192.168.1.100' });
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `HUBx` | Yes* | Hub password | `glmpttxf` |
| `HUBxIP` | Yes* | Hub IP address | `192.168.1.100` |

*Both must be defined for auto-loading (x = 1-10)

## Examples

### Single Hub
```env
HUB1=glmpttxf
HUB1IP=192.168.1.100
```

### Multiple Hubs
```env
HUB1=glmpttxf
HUB1IP=192.168.1.100

HUB2=dkcqbjkz
HUB2IP=192.168.1.101
```

### Partial Configuration (Won't Auto-Load)
```env
# Missing IP - will NOT auto-load
HUB1=glmpttxf

# Missing password - will NOT auto-load  
HUB2IP=192.168.1.101
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No HUBx/HUBxIP pairs found" | Add both `HUBx` and `HUBxIP` to `.env` |
| "connection failed, stored credentials only" | Hub is offline or IP changed |
| Nothing in discovered_hubs | Check `.env` file exists and has correct format |
| Wrong hub info | Verify password matches correct hub |

## Testing

```bash
# Validate configuration
node scripts/test-autoload.js

# Start and check
npm start
curl http://localhost:3000/health
```

## See Also

- [Full Documentation](autoload-hubs.md)
- [Setup Guide](setup.md)
- [README](../README.md)
