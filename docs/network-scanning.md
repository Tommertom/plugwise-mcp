# Network Scanning for Plugwise Hubs

This guide explains how to use the network scanning feature to automatically discover Plugwise hubs on your local network.

## Quick Start

### 1. Configure Your .env File

Create a `.env` file in the project root with your hub passwords:

```env
# Hub passwords (8-character codes from gateway stickers)
HUB1=glmpttxf
HUB2=dkcqbjkz

# Optional: Known IP addresses for faster discovery
HUB1IP=192.168.178.235
HUB2IP=192.168.178.218
```

**Where to find passwords:**
- Look at the back of your Plugwise gateway
- You'll find an 8-character code (letters and numbers)
- This is printed on a sticker, typically labeled as the device ID or password

### 2. Start the MCP Server

```bash
npm run build
npm start
```

### 3. Run Network Scan

Use the `scan_network` MCP tool:

```javascript
const result = await mcpClient.callTool('scan_network', {});
```

Or test it directly:

```bash
node scripts/test-network-scan.js
```

## How It Works

### Strategy 1: Known IP Testing (Fast)

If you provide `HUBxIP` variables in your `.env` file, the scanner will:
1. Test those specific IPs first
2. Use the corresponding `HUBx` password for authentication
3. Complete in seconds (no network-wide scanning needed)

**Example:**
```env
HUB1=glmpttxf
HUB1IP=192.168.178.235
HUB2=dkcqbjkz
HUB2IP=192.168.178.218
```

Result: Tests only 2 IPs, completes in ~2 seconds

### Strategy 2: Network Scanning (Comprehensive)

If no `HUBxIP` variables are provided, or if you specify a `network` parameter, the scanner will:
1. Auto-detect your local network (e.g., `192.168.178.0/24`)
2. Test all 254 possible IP addresses in parallel
3. Try each `HUBx` password for every IP
4. Report all discovered hubs

**Example scan output:**
```
Testing 2 known hub IP(s)...
✓ Found hub at 192.168.178.235: Plugwise Gateway
✓ Found hub at 192.168.178.218: Plugwise Gateway

Discovered: 2 hubs in 2.1 seconds
```

## Stored Hub Information

Once hubs are discovered, the MCP server stores:
- Hub name
- IP address
- Password
- Model type (smile_open_therm, smile, etc.)
- Firmware version
- Discovery timestamp

This information is kept in memory and used for:
1. **Passwordless connections**: `connect({ host: '192.168.178.235' })` automatically uses the stored password
2. **Auto-connection**: `connect()` with no parameters connects to the first discovered hub
3. **Health monitoring**: Check `/health` endpoint to see all discovered hubs

## API Usage Examples

### Scan and Connect Pattern

```javascript
// 1. Scan network
const scanResult = await mcpClient.callTool('scan_network', {});

console.log(`Found ${scanResult.discovered.length} hubs`);

// 2. Connect to first hub (automatic credentials)
await mcpClient.callTool('connect', {});

// 3. Get devices
const devices = await mcpClient.callTool('get_devices', {});
```

### Multi-Hub Management

```javascript
// Scan once
await mcpClient.callTool('scan_network', {});

// Switch between hubs
await mcpClient.callTool('connect', { host: '192.168.178.235' });
const hub1Devices = await mcpClient.callTool('get_devices', {});

await mcpClient.callTool('connect', { host: '192.168.178.218' });
const hub2Devices = await mcpClient.callTool('get_devices', {});
```

### Custom Network Scanning

```javascript
// Scan a specific network range
const result = await mcpClient.callTool('scan_network', {
  network: '10.0.0.0/24'
});
```

## Checking Discovered Hubs

Query the health endpoint to see all discovered hubs:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "server": "plugwise-mcp-server",
  "version": "1.0.0",
  "connected": true,
  "gateway": { ... },
  "discovered_hubs": [
    {
      "name": "Plugwise Gateway",
      "ip": "192.168.178.235",
      "model": "smile_open_therm",
      "discovered_at": "2025-10-13T18:26:44.680Z"
    },
    {
      "name": "Plugwise Gateway",
      "ip": "192.168.178.218",
      "model": "smile",
      "discovered_at": "2025-10-13T18:26:44.848Z"
    }
  ]
}
```

## Performance

### Fast Mode (with HUBxIP variables)
- Tests only known IPs
- ~1 second per hub
- Recommended for production use

### Full Scan Mode
- Scans entire subnet (254 addresses)
- 1.5 second timeout per IP
- Parallel testing of all passwords
- Can take 1-2 minutes depending on network

## Troubleshooting

### No Hubs Found

1. **Check .env file**: Ensure `HUB1`, `HUB2`, etc. are defined
   ```bash
   cat .env
   ```

2. **Verify passwords**: Passwords are case-sensitive
   - Check the sticker on your gateway
   - Common mistake: confusing '0' (zero) with 'O' (letter O)

3. **Check network connectivity**:
   ```bash
   ping 192.168.178.235
   ```

4. **Verify gateways are powered on**: Look for LED indicators

5. **Check network subnet**: Use `ip addr` to verify your local network range

### Scan Takes Too Long

1. **Use HUBxIP variables**: Speeds up scanning dramatically
2. **Specify network**: `scan_network({ network: '192.168.1.0/24' })`
3. **Check network size**: Scanning a /16 network will take much longer than /24

### Incorrect Gateway Found

If the scanner connects to an unexpected IP:
1. Check that the password matches the correct gateway
2. Multiple gateways may be using the same default password
3. Set specific `HUBxIP` variables to control which hubs are discovered

## Security Notes

1. **Password Storage**: Passwords are stored in memory only (not persisted to disk)
2. **Network Exposure**: Scanning generates network traffic - use on trusted networks only
3. **Credentials in Logs**: The server logs IP addresses but not passwords
4. **.env Security**: Add `.env` to `.gitignore` to prevent committing passwords

## Advanced Usage

### Bash Script Alternative

For standalone hub discovery without the MCP server:

```bash
./scripts/find-plugwise-hub.sh
```

This script:
- Uses passwords from `.env`
- Scans the local network
- Outputs discovered hub information
- Can be used in shell scripts or automation

### Integration with Home Automation

```javascript
// Periodic hub discovery
setInterval(async () => {
  const result = await mcpClient.callTool('scan_network', {});
  
  if (result.discovered.length !== previousCount) {
    console.log('Hub count changed! Reconfiguring...');
    // Handle new or missing hubs
  }
}, 300000); // Every 5 minutes
```
