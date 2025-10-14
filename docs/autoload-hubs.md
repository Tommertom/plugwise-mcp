# Automatic HUB Loading from .env

The Plugwise MCP Server automatically loads HUB configurations from your `.env` file when it starts up. This eliminates the need to manually scan the network or connect to known hubs.

## How It Works

When the server starts, it:

1. Reads the `.env` file looking for `HUBx` and `HUBxIP` pairs (where x is 1-10)
2. For each complete pair found:
   - Attempts to connect to the hub at the specified IP address
   - Retrieves hub information (name, model, firmware version)
   - Stores the credentials and information in memory
3. Makes these hubs immediately available for connection without scanning

## Configuration Format

```env
# Pattern: HUBx (password) and HUBxIP (IP address)
HUB1=your-password-here
HUB1IP=192.168.1.100

HUB2=another-password
HUB2IP=192.168.1.101

# You can define up to HUB10
HUB3=third-password
HUB3IP=192.168.1.102
```

## Requirements

For a hub to be auto-loaded, **both** environment variables must be defined:
- `HUBx` - The 8-character password from the gateway sticker
- `HUBxIP` - The IP address of the gateway on your network

## What Happens During Startup

### Successful Connection

If the server can reach the hub:

```
✓ Loaded HUB1 at 192.168.178.235: Plugwise Gateway (smile_open_therm)
```

The server retrieves:
- Gateway name
- Model/type
- Firmware version
- Stores credentials for instant connection

### Failed Connection

If the hub is temporarily unreachable:

```
⚠ Loaded HUB1 at 192.168.178.235 (connection failed, stored credentials only)
```

The server still stores:
- IP address
- Password
- Basic identification

The hub will be retried when you attempt to connect.

## Checking Loaded Hubs

After the server starts, check the health endpoint:

```bash
curl http://localhost:3000/health
```

Response shows loaded hubs:

```json
{
  "status": "ok",
  "discovered_hubs": [
    {
      "name": "Plugwise Gateway",
      "ip": "192.168.178.235",
      "model": "smile_open_therm",
      "discovered_at": "2025-10-13T18:53:23.666Z"
    }
  ]
}
```

## Benefits

### 1. Instant Connection
No need to scan the network - just call `connect` with no parameters:

```javascript
// Connects to first loaded hub automatically
await mcpClient.callTool('connect', {});
```

### 2. Faster Startup
Known IPs are tested immediately instead of scanning 254 addresses.

### 3. Reliable Configuration
Credentials are version-controlled (in .env.example) and environment-specific.

### 4. Multi-Hub Support
Pre-configure multiple hubs for seamless switching.

## Usage Examples

### Example 1: Single Hub Auto-Connect

**.env:**
```env
HUB1=glmpttxf
HUB1IP=192.168.178.235
```

**Code:**
```javascript
// No parameters needed - uses HUB1 automatically
await mcpClient.callTool('connect', {});
const devices = await mcpClient.callTool('get_devices', {});
```

### Example 2: Multiple Hubs

**.env:**
```env
HUB1=glmpttxf
HUB1IP=192.168.178.235

HUB2=dkcqbjkz
HUB2IP=192.168.178.218
```

**Code:**
```javascript
// Connect to specific hub by IP
await mcpClient.callTool('connect', { host: '192.168.178.218' });
// Password is loaded automatically from HUB2

// Or connect to first hub (HUB1)
await mcpClient.callTool('connect', {});
```

### Example 3: Fallback to Scanning

**.env:**
```env
# Only password, no IP
HUB1=glmpttxf
```

**Code:**
```javascript
// Server won't auto-load HUB1 (missing IP)
// Use scan_network to discover it
const result = await mcpClient.callTool('scan_network', {});
// Now HUB1 is discovered and stored

await mcpClient.callTool('connect', {});
```

## Testing Your Configuration

Use the test script to verify your .env configuration:

```bash
node scripts/test-autoload.js
```

Output:
```
🧪 Testing automatic HUB loading from .env

✓ Found HUB1 configuration:
  - IP: 192.168.178.235
  - Password: glmp****

✓ Found HUB2 configuration:
  - IP: 192.168.178.218
  - Password: dkcq****

✅ Found 2 complete HUB configuration(s)
```

## Security Considerations

1. **Never commit .env to git** - Use `.env.example` as a template
2. **Use .gitignore** - Ensure `.env` is in your `.gitignore` file
3. **Rotate passwords** - If credentials are compromised, change them on the gateway
4. **Network security** - Ensure your network is secure (WPA2/WPA3, strong WiFi password)

## Troubleshooting

### No hubs loaded on startup

**Symptom:**
```
No HUBx/HUBxIP pairs found in .env file
```

**Solution:**
Check that:
1. `.env` file exists in project root
2. Both `HUBx` and `HUBxIP` are defined for each hub
3. No typos in variable names (case-sensitive)

### Hub marked as "connection failed"

**Symptom:**
```
⚠ Loaded HUB1 at 192.168.178.235 (connection failed, stored credentials only)
```

**Possible causes:**
1. Hub is offline or unreachable
2. Wrong IP address
3. Network connectivity issues
4. Wrong password

**Solution:**
1. Ping the IP: `ping 192.168.178.235`
2. Check hub power and network connection
3. Verify IP hasn't changed (use DHCP reservation)
4. Test manual connection: `curl http://smile:password@192.168.178.235`

### Wrong hub information displayed

**Symptom:**
Health endpoint shows incorrect model or name.

**Solution:**
1. Verify the password matches the correct hub
2. Check no duplicate IP addresses
3. Restart the server after fixing .env

## Related Documentation

- [Setup Guide](setup.md) - Complete server setup instructions
- [Network Scanning](network-scanning.md) - Details on the scan_network tool
- [README](../README.md) - Main documentation
