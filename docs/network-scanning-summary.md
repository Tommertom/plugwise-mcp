# Plugwise MCP Server - Network Scanning Feature

## Overview

The Plugwise MCP Server now includes automatic network scanning to discover all Plugwise hubs on your local network. This eliminates the need to manually configure IP addresses and passwords for each connection.

## What Was Added

### 1. New MCP Tool: `scan_network`

Automatically discovers Plugwise hubs using passwords from your `.env` file.

**Features:**
- Smart scanning: Tests known IPs first (HUBxIP variables) for instant results
- Full network scan: Scans entire subnet when needed
- Parallel processing: Tests multiple IPs simultaneously for speed
- Credential storage: Stores discovered hub credentials in memory
- Auto-detection: Automatically determines your local network range

### 2. Enhanced `connect` Tool

The `connect` tool now supports passwordless connections:
- Call `connect()` with no parameters to connect to first discovered hub
- Call `connect({ host: 'IP' })` to connect using stored credentials
- Manual credentials still supported for direct connections

### 3. Environment Variable Support

New `.env` variables:
```env
# Hub passwords (required)
HUB1=glmpttxf
HUB2=dkcqbjkz

# Hub IPs (optional, enables fast scanning)
HUB1IP=192.168.178.235
HUB2IP=192.168.178.218
```

### 4. Health Endpoint Enhancement

The `/health` endpoint now shows all discovered hubs:
```json
{
  "discovered_hubs": [
    {
      "name": "Plugwise Gateway",
      "ip": "192.168.178.235",
      "model": "smile_open_therm",
      "discovered_at": "2025-10-13T18:26:44.680Z"
    }
  ]
}
```

## Files Modified

### Source Code
- `src/mcp/server.ts` - Added scanning logic, credential storage, enhanced connect tool
- Build output automatically updated in `build/mcp/`

### Documentation
- `docs/plugwise-mcp-server.md` - Updated with scan_network tool documentation
- `docs/network-scanning.md` - New comprehensive scanning guide

### Test Scripts
- `scripts/test-network-scan.js` - Test script for scanning functionality
- `scripts/workflow-demo.js` - Complete workflow demonstration
- `scripts/find-plugwise-hub.sh` - Bash script for standalone hub discovery (existing)

### Configuration
- `.env` - Now supports HUB1, HUB2, HUB1IP, HUB2IP variables

## Usage Example

### Quick Start (3 commands)

```javascript
// 1. Scan for hubs
await mcpClient.callTool('scan_network', {});

// 2. Connect (credentials automatic)
await mcpClient.callTool('connect', {});

// 3. Get devices
await mcpClient.callTool('get_devices', {});
```

### Multi-Hub Management

```javascript
// Scan once
await mcpClient.callTool('scan_network', {});

// Switch between hubs
await mcpClient.callTool('connect', { host: '192.168.178.235' });
const hub1Data = await mcpClient.callTool('get_devices', {});

await mcpClient.callTool('connect', { host: '192.168.178.218' });
const hub2Data = await mcpClient.callTool('get_devices', {});
```

## Performance

### With HUBxIP Variables (Recommended)
- **Speed**: ~1 second per hub
- **Network Traffic**: Minimal (only tests known IPs)
- **Use Case**: Production environments with known hub locations

### Full Network Scan
- **Speed**: 1-2 minutes (depends on network size)
- **Network Traffic**: Tests all 254 IPs in subnet
- **Use Case**: Initial discovery, hub moved to new IP

## Testing

Three test scripts are available:

1. **Network Scan Test**
   ```bash
   node scripts/test-network-scan.js
   ```
   Tests scanning and basic connectivity

2. **Workflow Demo**
   ```bash
   node scripts/workflow-demo.js
   ```
   Demonstrates complete workflow with multiple hubs

3. **Full MCP Test**
   ```bash
   node scripts/test-mcp-server.js
   ```
   Tests all MCP tools and resources

## Security

- **Passwords**: Stored in memory only, never written to disk
- **Network**: Scanning only occurs on local network
- **Credentials**: Not logged or exposed in API responses (except in scan results)
- **.env**: Added to .gitignore to prevent committing secrets

## Architecture

### Hub Discovery Storage

```typescript
interface DiscoveredHub {
    name: string;
    ip: string;
    password: string;
    model?: string;
    firmware?: string;
    discoveredAt: Date;
}

const discoveredHubs: Map<string, DiscoveredHub> = new Map();
```

### Scanning Strategy

1. **Check for HUBxIP variables** → Test known IPs first
2. **Auto-detect network** → Use `ip route` command
3. **Parallel scan** → Test all IPs simultaneously with 1.5s timeout
4. **Store results** → Keep credentials in memory for later use

## Benefits

1. **Zero-configuration**: No need to find IP addresses manually
2. **Multi-hub support**: Automatically discovers all hubs
3. **Fast reconnection**: Credentials cached after first scan
4. **Resilient**: Handles dynamic IPs and hub reboots
5. **Developer-friendly**: Simple API, automatic credential management

## Backward Compatibility

The original manual connection method still works:

```javascript
await mcpClient.callTool('connect', {
  host: '192.168.178.235',
  password: 'glmpttxf'
});
```

## Future Enhancements

Potential improvements:
- Persistent storage of discovered hubs (database/file)
- Automatic re-scanning on connection failure
- Hub naming/aliasing (custom names in .env)
- HTTPS support for secure connections
- Hub health monitoring and alerts

## Conclusion

The network scanning feature significantly simplifies Plugwise hub management, especially in environments with multiple hubs. The combination of fast known-IP testing and comprehensive network scanning provides both convenience and flexibility.

**Testing Status**: ✅ All tests passing
- Successfully discovers 2 hubs in test environment
- Auto-connection working correctly
- Multi-hub switching functional
- Device retrieval from both hubs successful
