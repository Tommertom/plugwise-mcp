# Plugwise MCP Server

A TypeScript-based Model Context Protocol (MCP) server for Plugwise smart home integration with automatic network discovery.

## ✨ Key Features

- 🔍 **Automatic Network Scanning**: Discovers all Plugwise hubs on your network
- 🔐 **Credential Management**: Stores hub passwords securely from .env file
- 🔌 **Device Control**: Control thermostats, switches, and smart plugs
- 🌡️ **Temperature Management**: Set temperatures, presets, and schedules
- 📊 **Energy Monitoring**: Read power consumption and sensor data
- 🏠 **Multi-Hub Support**: Manage multiple gateways simultaneously
- 🔄 **Real-time Updates**: Get current device states and measurements

## 🚀 Quick Start

### Installation via npm (Recommended)

Install globally to use with any MCP client:

```bash
npm install -g plugwise-mcp-server
```

Or use directly with npx (no installation needed):

```bash
npx plugwise-mcp-server
```

### Installation from Source

```bash
git clone https://github.com/Tommertom/plugwise-mcp-server.git
cd plugwise-mcp-server
npm install
npm run build
```

### Prerequisites
- Node.js 17 or higher
- npm or yarn
- Plugwise gateway (Adam, Anna, Smile P1, or Stretch)

### Quick Test

```bash
# Automatically discover and connect to your hubs
node scripts/workflow-demo.js
```

### Start the Server

When installed via npm:

```bash
plugwise-mcp-server
```

When running from source:

```bash
npm start
```

Server runs at:
- **MCP Endpoint**: `http://localhost:3000/mcp`
- **Health Check**: `http://localhost:3000/health`

## 🔌 Adding the MCP Server to Your Client

The Plugwise MCP server can work with any MCP client that supports standard I/O (stdio) as the transport medium. Here are specific instructions for some popular tools:

### Claude Desktop

To configure Claude Desktop to use the Plugwise MCP server, edit the `claude_desktop_config.json` file. You can open or create this file from the Claude > Settings menu. Select the Developer tab, then click Edit Config.

```json
{
  "mcpServers": {
    "plugwise": {
      "command": "npx",
      "args": ["-y", "plugwise-mcp-server@latest"]
    }
  }
}
```

### Cline

To configure Cline to use the Plugwise MCP server, edit the `cline_mcp_settings.json` file. You can open or create this file by clicking the MCP Servers icon at the top of the Cline pane, then clicking the Configure MCP Servers button.

```json
{
  "mcpServers": {
    "plugwise": {
      "command": "npx",
      "args": ["-y", "plugwise-mcp-server@latest"],
      "disabled": false
    }
  }
}
```

### Cursor

To configure Cursor to use the Plugwise MCP server, edit either the file `.cursor/mcp.json` (to configure only a specific project) or the file `~/.cursor/mcp.json` (to make the MCP server available in all projects):

```json
{
  "mcpServers": {
    "plugwise": {
      "command": "npx",
      "args": ["-y", "plugwise-mcp-server@latest"]
    }
  }
}
```

### Visual Studio Code Copilot

To configure a single project, edit the `.vscode/mcp.json` file in your workspace:

```json
{
  "servers": {
    "plugwise": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "plugwise-mcp-server@latest"]
    }
  }
}
```

To make the server available in every project you open, edit your user settings:

```json
{
  "mcp": {
    "servers": {
      "plugwise": {
        "type": "stdio",
        "command": "npx",
        "args": ["-y", "plugwise-mcp-server@latest"]
      }
    }
  }
}
```

### Windsurf Editor

To configure Windsurf Editor, edit the file `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "plugwise": {
      "command": "npx",
      "args": ["-y", "plugwise-mcp-server@latest"]
    }
  }
}
```

### Environment Variables

The server reads hub passwords from environment variables. Create a `.env` file in your project root or set system-wide environment variables:

```env
# Hub passwords (8-character codes from gateway stickers)
HUB1=glmpttxf
HUB2=dkcqbjkz

# Optional: Known IP addresses for faster discovery and auto-loading
HUB1IP=192.168.178.235
HUB2IP=192.168.178.218
```

### Quick Test

```bash
# Automatically discover and connect to your hubs
node scripts/workflow-demo.js
```

## 📡 MCP Tools

### Network Discovery

#### `scan_network`
Automatically scan your network for Plugwise hubs using passwords from `.env`.

```javascript
await mcpClient.callTool('scan_network', {});
// Returns: { discovered: [ { name, ip, model, firmware } ], scanned_ips: 2 }
```

**Features:**
- Tests known IPs first if `HUBxIP` variables are provided (instant)
- Falls back to full network scan if needed (1-2 minutes)
- Stores credentials automatically for later use

#### `connect`
Connect to a Plugwise gateway. After scanning, credentials are automatic!

```javascript
// Auto-connect to first discovered hub
await mcpClient.callTool('connect', {});

// Connect to specific hub (password from scan)
await mcpClient.callTool('connect', { host: '192.168.178.235' });

// Manual connection (without scanning)
await mcpClient.callTool('connect', { 
  host: '192.168.178.235', 
  password: 'glmpttxf' 
});
```

### Device Management

#### `get_devices`
Get all devices and their current states.

```javascript
const result = await mcpClient.callTool('get_devices', {});
// Returns all devices, zones, sensors, and their current values
```

### Climate Control

#### `set_temperature`
Set thermostat temperature setpoint.

```javascript
await mcpClient.callTool('set_temperature', {
  location_id: 'zone123',
  setpoint: 21.0
});
```

#### `set_preset`
Change thermostat preset mode.

```javascript
await mcpClient.callTool('set_preset', {
  location_id: 'zone123',
  preset: 'away'  // Options: home, away, sleep, vacation
});
```

### Device Control

#### `control_switch`
Turn switches/plugs on or off.

```javascript
await mcpClient.callTool('control_switch', {
  appliance_id: 'plug123',
  state: 'on'  // 'on' or 'off'
});
```

### Gateway Management

- **`set_gateway_mode`**: Set gateway mode (home, away, vacation)
- **`set_dhw_mode`**: Set domestic hot water mode (auto, boost, comfort, off)
- **`set_regulation_mode`**: Set heating regulation mode
- **`delete_notification`**: Clear gateway notifications
- **`reboot_gateway`**: Reboot the gateway (use with caution)

### MCP Resources

- **`plugwise://devices`**: Access current state of all devices as a resource

### MCP Prompts

- **`setup_guide`**: Get comprehensive step-by-step setup instructions

## 🧪 Testing

### Comprehensive Read-Only Test Suite

```bash
npm run test:all
```

This runs a complete test of all read-only MCP operations:
- ✅ Server health check
- ✅ MCP protocol initialization
- ✅ Network scanning for hubs
- ✅ Gateway connection and info retrieval
- ✅ Device state reading
- ✅ Resources and prompts

**Safe**: Only tests read operations, never changes device states.

See [Test Documentation](docs/test-all-script.md) for details.

### Complete Workflow Demo

```bash
node scripts/workflow-demo.js
```

This demonstrates:
1. ✅ Network scanning with .env passwords
2. ✅ Auto-connection without credentials
3. ✅ Device discovery and listing
4. ✅ Multi-hub management

### Network Scanning Test

```bash
node scripts/test-network-scan.js
```

### Full MCP Test Suite

```bash
node scripts/test-mcp-server.js
```

### Bash Script for Hub Discovery

```bash
./scripts/find-plugwise-hub.sh
```

## 🏗️ Supported Devices

### Gateways
- **Adam**: Smart home hub with OpenTherm support (thermostat control, floor heating)
- **Anna**: Standalone thermostat gateway
- **Smile P1**: Energy monitoring gateway (electricity, gas, solar)
- **Stretch**: Legacy hub for connecting Circle smart plugs

### Connected Devices
- **Jip**: Motion sensor with illuminance detection
- **Lisa**: Radiator valve (requires hub)
- **Tom/Floor**: Floor heating controller
- **Koen**: Radiator valve (requires a Plug as intermediary)
- **Plug**: Smart plug with power monitoring (Zigbee)
- **Aqara Plug**: Third-party Zigbee smart plug
- **Circle**: Legacy Circle/Circle+ plugs (via Stretch only)

## 📖 Documentation

- **[Setup Guide](docs/setup.md)** - Detailed setup instructions
- **[MCP Server Documentation](docs/plugwise-mcp-server.md)** - Complete API reference
- **[Network Scanning Guide](docs/network-scanning.md)** - Network discovery deep dive
- **[Network Scanning Summary](docs/network-scanning-summary.md)** - Feature overview

## 🔧 Development

### Development Mode

Run with hot-reload:

```bash
npm run dev
```

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

### Project Structure

```
plugwise/
├── src/mcp/              # TypeScript source
│   ├── server.ts         # MCP server with tools
│   ├── plugwise-client.ts # Plugwise API client
│   └── plugwise-types.ts  # Type definitions
├── build/mcp/            # Compiled JavaScript
├── docs/                 # Documentation
├── scripts/              # Test scripts
│   ├── workflow-demo.js
│   ├── test-network-scan.js
│   ├── test-mcp-server.js
│   └── find-plugwise-hub.sh
├── .env                  # Hub credentials
├── package.json
└── tsconfig.json
```

## 🔐 Security

1. **Password Storage**: Store passwords in `.env` file only (never in code)
2. **Git Ignore**: `.env` is in `.gitignore` to prevent committing secrets
3. **Network Security**: Plugwise uses HTTP Basic Auth (not HTTPS)
   - Keep gateways on secure local network
   - Use VPN for remote access
   - Consider separate VLAN for IoT devices
4. **API Access**: The API has full control over your heating system - restrict access accordingly

## 🐛 Troubleshooting

### No Hubs Found During Scan

1. Check `.env` file has `HUB1`, `HUB2`, etc. defined
2. Verify passwords are correct (case-sensitive, check gateway sticker)
3. Ensure gateways are powered on and connected to network
4. Confirm you're on the same network as the hubs
5. Try: `ping <gateway_ip>` to test connectivity

### Connection Errors

1. Verify IP address is correct
2. Check firewall isn't blocking port 80
3. Test with manual connection: `curl http://<ip>/core/domain_objects`
4. Ensure gateway isn't overloaded with requests

### Scan Takes Too Long

1. Add `HUBxIP` variables to `.env` for instant scanning
2. Specify network: `scan_network({ network: '192.168.1.0/24' })`
3. Check network size (scanning /16 is much slower than /24)

## 🤝 Integration Examples

### Using with Claude Code

```bash
claude mcp add --transport http plugwise-server http://localhost:3000/mcp
```

### Using with VS Code Copilot

Add to `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "plugwise": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Using MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

Connect to: `http://localhost:3000/mcp`

## 📊 Example Workflows

### Morning Routine

```javascript
// Scan and connect
await mcpClient.callTool('scan_network', {});
await mcpClient.callTool('connect', {});

// Set home mode
await mcpClient.callTool('set_preset', {
  location_id: 'living_room',
  preset: 'home'
});

// Warm up bathroom
await mcpClient.callTool('set_temperature', {
  location_id: 'bathroom',
  setpoint: 22.0
});
```

### Energy Monitoring

```javascript
const devices = await mcpClient.callTool('get_devices', {});

for (const [id, device] of Object.entries(devices.data)) {
  if (device.sensors?.electricity_consumed) {
    console.log(`${device.name}: ${device.sensors.electricity_consumed}W`);
  }
}
```

### Multi-Hub Management

```javascript
// Discover all hubs
const scan = await mcpClient.callTool('scan_network', {});

// Get devices from each hub
for (const hub of scan.discovered) {
  await mcpClient.callTool('connect', { host: hub.ip });
  const devices = await mcpClient.callTool('get_devices', {});
  console.log(`Hub ${hub.ip}: ${Object.keys(devices.data).length} devices`);
}
```

## 🌟 Credits

Based on the excellent [python-plugwise](https://github.com/plugwise/python-plugwise) library.

## 📄 License

MIT License - See LICENSE file for details

## 🚀 Version

Current version: **1.0.0**

- ✅ Full MCP protocol support
- ✅ Automatic network scanning
- ✅ Multi-hub management
- ✅ Complete device control
- ✅ Comprehensive documentation
