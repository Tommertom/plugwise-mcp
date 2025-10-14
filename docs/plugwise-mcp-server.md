# Plugwise MCP Server

A Model Context Protocol (MCP) server for interacting with Plugwise smart home devices. This server provides tools and resources for controlling Plugwise gateways (Adam, Anna, Smile P1, Stretch) and their connected devices.

## Overview

This implementation is based on the [python-plugwise](https://github.com/plugwise/python-plugwise) library and provides a TypeScript/Node.js interface to Plugwise devices via their HTTP XML API.

## Supported Devices

### Gateways
- **Adam**: Smart home hub with OpenTherm support
- **Anna**: Thermostat gateway
- **Smile P1**: Energy monitoring gateway
- **Stretch**: Hub for connecting Circle plugs

### Connected Devices
- **Jip**: Motion and illuminance sensor
- **Lisa**: Radiator valve
- **Tom/Floor**: Floor heating controller
- **Koen**: Radiator valve (requires a Plug)
- **Plug**: Smart plug with power monitoring
- **Aqara Plug**: Third-party smart plug
- **Circle**: Legacy smart plug (via Stretch)

## Installation

```bash
npm install
npm run build
```

## Configuration

The server requires the following information to connect to your Plugwise gateway:

- **Host**: IP address or hostname of your Plugwise gateway
- **Password**: The password printed on the back of your gateway (8-character code)
- **Port** (optional): HTTP port, defaults to 80
- **Username** (optional): Username, defaults to "smile"

### Environment Variables (.env file)

For easier management of multiple hubs, create a `.env` file in the project root:

```env
# Hub passwords (8-character codes from the gateway stickers)
HUB1=glmpttxf
HUB2=dkcqbjkz

# Optional: Known IP addresses for faster scanning
HUB1IP=192.168.178.235
HUB2IP=192.168.178.218
```

The server will automatically load these variables and the `scan_network` tool will use them to discover your hubs.

### Finding Your Gateway

1. **IP Address**: Check your router's DHCP client list or use a network scanner
2. **Password**: Located on a sticker on the back of your gateway device
3. **Gateway Types**:
   - Adam: Usually has hostname `smile000000` (6-digit number)
   - Anna: Usually has hostname `smile000000` 
   - Smile P1: Usually has hostname `smile000000`

**Quick Discovery**: Use the `scan_network` tool to automatically find all Plugwise hubs on your local network using the passwords from your `.env` file.

## Running the Server

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` by default.

You can customize the host and port using environment variables:

```bash
PORT=8080 HOST=0.0.0.0 npm start
```

## MCP Tools

### scan_network
Scan the local network for Plugwise hubs using passwords from your `.env` file. Discovered hubs are stored in the server for quick connection.

**Parameters:**
- `network` (string, optional): Network to scan in CIDR notation (e.g., `192.168.1.0/24`). If not provided, auto-detects your local network.

**Returns:**
```json
{
  "success": true,
  "discovered": [
    {
      "name": "Plugwise Gateway",
      "ip": "192.168.178.235",
      "password": "glmpttxf",
      "model": "smile_open_therm",
      "firmware": "3.7.8"
    },
    {
      "name": "Plugwise Gateway",
      "ip": "192.168.178.218",
      "password": "dkcqbjkz",
      "model": "smile",
      "firmware": "4.4.3"
    }
  ],
  "scanned_ips": 2
}
```

**Behavior:**
- If `HUBxIP` variables are defined in `.env`, it tests those IPs first (fast)
- If no IPs are provided or `network` parameter is specified, it performs a full network scan
- Stores discovered hubs with their credentials for later use
- Multiple passwords are tested for each IP address

### connect
Connect to a Plugwise gateway and retrieve gateway information.

**Parameters:**
- `host` (string, optional): IP address or hostname of the gateway. If omitted, connects to first discovered hub.
- `password` (string, optional): Gateway password. If omitted and host matches a discovered hub, uses stored password.
- `port` (number, optional): Port number (default: 80)
- `username` (string, optional): Username (default: "smile")

**Returns:**
```json
{
  "success": true,
  "gateway_info": {
    "name": "Adam",
    "model": "159.2",
    "type": "thermostat",
    "version": "3.0.15",
    "hostname": "smile000000",
    "mac_address": "AA:BB:CC:DD:EE:FF"
  }
}
```

**Note:** After running `scan_network`, you can call `connect` without any parameters to connect to the first discovered hub, or provide just the `host` parameter to connect to a specific discovered hub using its stored password.

### get_devices
Retrieve all devices and their current states.

**Parameters:** None

**Returns:**
```json
{
  "success": true,
  "data": {
    "gateway_id": "abc123",
    "heater_id": "def456",
    "gateway_info": { ... },
    "entities": {
      "device_id_1": {
        "name": "Living Room",
        "dev_class": "zone_thermostat",
        "sensors": {
          "temperature": 21.5,
          "setpoint": 20.0
        },
        "binary_sensors": {
          "heating_state": true
        }
      }
    }
  }
}
```

### set_temperature
Set the temperature setpoint on a thermostat.

**Parameters:**
- `location_id` (string): ID of the location/zone
- `setpoint` (number, optional): Temperature setpoint in Celsius
- `setpoint_low` (number, optional): Low setpoint for heating
- `setpoint_high` (number, optional): High setpoint for cooling

**Example:**
```json
{
  "location_id": "zone123",
  "setpoint": 21.0
}
```

### set_preset
Set the preset mode on a thermostat.

**Parameters:**
- `location_id` (string): ID of the location/zone
- `preset` (string): Preset name (e.g., "home", "away", "sleep", "vacation")

**Example:**
```json
{
  "location_id": "zone123",
  "preset": "away"
}
```

### control_switch
Turn a switch or relay on or off.

**Parameters:**
- `appliance_id` (string): ID of the appliance/device
- `state` (string): "on" or "off"
- `model` (string, optional): Switch model type (default: "relay")

**Example:**
```json
{
  "appliance_id": "plug123",
  "state": "on"
}
```

### set_gateway_mode
Set the gateway operational mode.

**Parameters:**
- `mode` (string): "home", "away", or "vacation"

**Example:**
```json
{
  "mode": "away"
}
```

### set_dhw_mode
Set the domestic hot water (DHW) heating mode.

**Parameters:**
- `mode` (string): "auto", "boost", "comfort", or "off"

**Example:**
```json
{
  "mode": "boost"
}
```

### set_regulation_mode
Set the heating regulation mode.

**Parameters:**
- `mode` (string): "heating", "off", "bleeding_cold", or "bleeding_hot"

**Example:**
```json
{
  "mode": "heating"
}
```

### delete_notification
Delete the active notification from the gateway.

**Parameters:** None

### reboot_gateway
Reboot the Plugwise gateway (use with caution).

**Parameters:** None

## MCP Resources

### plugwise://devices
Access the current state and data of all Plugwise devices as a resource.

**URI:** `plugwise://devices`

**Returns:** JSON representation of all devices and their states.

## MCP Prompts

### setup_guide
Get step-by-step guidance for setting up Plugwise integration.

## API Endpoints

### Health Check
```
GET http://localhost:3000/health
```

Returns server status and connection information:
```json
{
  "status": "ok",
  "server": "plugwise-mcp-server",
  "version": "1.0.0",
  "connected": true,
  "gateway": {
    "name": "Adam",
    "model": "159.2",
    "type": "thermostat"
  }
}
```

### MCP Endpoint
```
POST http://localhost:3000/mcp
```

The main MCP protocol endpoint for tool and resource requests.

## Usage Examples

### Example 1: Connect and Get Temperature

```typescript
// 1. Connect to gateway
const connectResult = await mcpClient.callTool('connect', {
  host: '192.168.1.100',
  password: 'abcd1234'
});

// 2. Get all devices
const devicesResult = await mcpClient.callTool('get_devices', {});

// 3. Find a thermostat and get its temperature
const devices = devicesResult.data.entities;
for (const [id, device] of Object.entries(devices)) {
  if (device.sensors?.temperature) {
    console.log(`${device.name}: ${device.sensors.temperature}°C`);
  }
}
```

### Example 1: Quick Start with Network Scanning

```typescript
// Step 1: Scan network for hubs (using passwords from .env)
const scanResult = await mcpClient.callTool('scan_network', {});

console.log(`Found ${scanResult.discovered.length} hub(s)`);
// Output: Found 2 hub(s)

// Step 2: Connect to first discovered hub (no credentials needed)
const connectResult = await mcpClient.callTool('connect', {});

console.log(`Connected to ${connectResult.gateway_info.name}`);
// Output: Connected to Plugwise Gateway

// Step 3: Get all devices
const devices = await mcpClient.callTool('get_devices', {});

console.log(`Found ${Object.keys(devices.data).length} entities`);
// Output: Found 14 entities
```

### Example 2: Connect to Specific Hub

```typescript
// After scanning, connect to a specific hub by IP
await mcpClient.callTool('connect', {
  host: '192.168.178.218'  // Password automatically used from scan
});
```

### Example 3: Manual Connection

```typescript
// Connect without scanning (provide full credentials)
await mcpClient.callTool('connect', {
  host: '192.168.178.235',
  password: 'glmpttxf'
});
```

### Example 4: Control Thermostat

```typescript
// Set temperature to 21°C
await mcpClient.callTool('set_temperature', {
  location_id: 'zone123',
  setpoint: 21.0
});

// Set to away mode
await mcpClient.callTool('set_preset', {
  location_id: 'zone123',
  preset: 'away'
});
```

### Example 5: Control Smart Plugs

```typescript
// Turn on a plug
await mcpClient.callTool('control_switch', {
  appliance_id: 'plug123',
  state: 'on'
});

// Turn off after 1 hour
setTimeout(async () => {
  await mcpClient.callTool('control_switch', {
    appliance_id: 'plug123',
    state: 'off'
  });
}, 3600000);
```

### Example 6: Monitor Energy Consumption

```typescript
// Get current power consumption
const devices = await mcpClient.callTool('get_devices', {});

for (const [id, device] of Object.entries(devices.data.entities)) {
  if (device.sensors?.electricity_consumed) {
    console.log(`${device.name}: ${device.sensors.electricity_consumed}W`);
  }
}
```

## Troubleshooting

### Connection Issues

**Problem:** Cannot connect to gateway

**Solutions:**
1. Verify the IP address is correct
2. Ensure the gateway is on the same network
3. Check that the password is correct (case-sensitive)
4. Verify port 80 is accessible (no firewall blocking)
5. Try pinging the gateway: `ping <gateway_ip>`

### Authentication Errors

**Problem:** "Invalid credentials" error

**Solutions:**
1. Double-check the password on the gateway label
2. Ensure you're using the correct username (default: "smile")
3. Some gateways may have custom passwords set - check your documentation

### Device Not Found

**Problem:** Device ID not found in entities

**Solutions:**
1. Run `get_devices` to list all available devices and their IDs
2. Ensure the device is properly paired with the gateway
3. Check that the device is powered on and within range
4. Restart the gateway if devices are not appearing

### Timeout Errors

**Problem:** Requests timing out

**Solutions:**
1. Increase the timeout value in the configuration
2. Check network latency to the gateway
3. Ensure the gateway is not overloaded with requests
4. Try rebooting the gateway

## Security Considerations

1. **Password Storage**: Never hardcode passwords in your code. Use environment variables or secure configuration management.

2. **Network Security**: The Plugwise HTTP API uses Basic Authentication over HTTP (not HTTPS). Ensure your network is secure and consider:
   - Using a VPN when accessing remotely
   - Keeping the gateway on a separate VLAN
   - Restricting access to trusted devices only

3. **API Access**: The API has full control over your heating system and devices. Restrict access to the MCP server appropriately.

## Technical Details

### XML API

The Plugwise gateways expose an HTTP XML API with endpoints:
- `/core/domain_objects`: Main data endpoint with all devices and states
- `/core/appliances`: Appliance-specific data
- `/core/locations`: Location/zone data
- `/core/modules`: Module information
- `/core/notifications`: System notifications
- `/core/rules`: Schedule rules

### Data Refresh

The client fetches fresh data from the gateway on each request. For production use, consider implementing caching to reduce load on the gateway.

### Limitations

1. **XML Parsing**: The current implementation provides basic XML parsing. Complex nested structures may require enhancement.
2. **Schedule Management**: Full schedule manipulation is not yet implemented.
3. **Legacy Devices**: Some older firmware versions may have limited support.
4. **USB Devices**: This implementation only supports networked devices, not USB/Stick devices.

## Development

### Project Structure

```
plugwise/
├── src/
│   └── mcp/
│       ├── server.ts           # Main MCP server
│       ├── plugwise-client.ts  # Plugwise HTTP client
│       └── plugwise-types.ts   # TypeScript type definitions
├── build/                      # Compiled JavaScript
├── docs/                       # Documentation
├── scripts/                    # Test scripts
└── tests/                      # Test files
```

### Building

```bash
npm run build
```

### Testing

Create a test script in `scripts/test-mcp-server.js` or `scripts/test-mcp-server.ts`.

## Contributing

This implementation is based on the excellent work of the python-plugwise team. For issues or contributions, please refer to the main repository.

## References

- [python-plugwise GitHub](https://github.com/plugwise/python-plugwise)
- [Home Assistant Plugwise Integration](https://www.home-assistant.io/integrations/plugwise/)
- [Model Context Protocol](https://modelcontextprotocol.io/)

## License

MIT License - See LICENSE file for details.

## Acknowledgments

- The python-plugwise team (@bouwew, @CoMPaTech, @brefra) for the original Python implementation
- Plugwise B.V. for their smart home products
- The Home Assistant community for extensive testing and feedback
