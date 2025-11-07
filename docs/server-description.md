# Server Description Format

## Hub Information Display

The MCP server description dynamically includes information about all configured hubs. This information is loaded from the `mcp_data/plugwise/hubs/` directory.

### Format

For each hub, the server description displays:
```
- [Hub Name] ([IP Address]) - password: [filename]
```

### Example

```
- Plugwise Gateway (192.168.178.235) - password: glmpttxf
```

Where:
- **Hub Name**: The friendly name of the hub (e.g., "Plugwise Gateway")
- **IP Address**: The network IP address of the hub
- **Password**: The filename (without .json extension) from the hubs directory, which is also the password used to authenticate with the hub

### File Structure

Hub configuration files are stored as JSON files in:
```
mcp_data/plugwise/hubs/[password].json
```

Example: `mcp_data/plugwise/hubs/glmpttxf.json`

The filename itself serves as the password for the hub, making it easy to reference in commands and configurations.

---

## Device Information Display

The MCP server description also dynamically includes all cached devices. This information is loaded from the `mcp_data/plugwise/devices/` directory at server startup.

### Format

For each hub with devices, the description displays:
```
Hub: [Hub Name] - password: [password]
- [Device Name] ([Device Type]) [ID: [Device ID]]
```

### Example

```
Known devices (use get_devices to refresh):

Hub: Plugwise Gateway - password: glmpttxf
- Licht boompje (lamp) [ID: 22ac469f705c4f4e90b801017694163a]
- Central heating boiler (heater_central) [ID: e5cad71698f24fd99ca0c734318d4f1a]
- Woonkamer (zone) [ID: 2b763b0903ad4c0697669b7d3982a005]
```

### Device Storage Format

Individual device files are stored as:
```
mcp_data/plugwise/devices/[HubName]_[DeviceID].json
```

Each file contains:
- `hubName`: Name of the hub this device belongs to
- `deviceId`: Unique device identifier
- `humanReadableName`: User-friendly device name
- `updatedAt`: Last update timestamp
- `password`: Hub password (for connecting to the hub)
- `device`: Complete device object with capabilities

### Example Device File

```json
{
  "hubName": "Plugwise Gateway",
  "deviceId": "22ac469f705c4f4e90b801017694163a",
  "humanReadableName": "Licht boompje",
  "updatedAt": "2025-11-07T12:22:13.217Z",
  "password": "glmpttxf",
  "device": {
    "id": "22ac469f705c4f4e90b801017694163a",
    "name": "Licht boompje",
    "type": "lamp",
    "dev_class": "lamp",
    "hubName": "Plugwise Gateway",
    "available": true,
    "capabilities": {
      "hasTemperature": false,
      "hasSwitch": true,
      "hasPresets": false,
      "hasSensors": false
    }
  }
}
```

### How Devices are Loaded

1. **At Server Startup**: The server scans all JSON files in the devices directory
2. **Groups by Hub**: Devices are automatically grouped by their `hubName` field
3. **Displays in Description**: All discovered devices appear in the server description
4. **Refresh Mechanism**: Run `get_devices` tool to update the cached device information

### Usage

When AI agents or clients connect to the MCP server, they receive comprehensive information including:

**Hub Information:**
1. **Discover available hubs** without making additional tool calls
2. **Access credentials** (password) needed to connect to hubs
3. **Identify hubs by name or IP** for subsequent operations
4. **Plan actions** based on available infrastructure

**Device Information:**
1. **See all cached devices** immediately upon connection
2. **Identify devices by name, type, or ID** for control operations
3. **Understand device capabilities** (lamp, thermostat, zone, etc.)
4. **Plan automation workflows** based on available devices

### Dynamic Updates

**Hubs:**
- Hub list is loaded when the server starts
- To add new hubs: Use the `add_hub` tool and restart the server

**Devices:**
- Device list is loaded when the server starts from cached files
- To update devices: Call `get_devices` tool (automatically saves to cache)
- Restart server to see updated devices in the description

### Security Note

The password is displayed in the server description because:
- It's required for hub authentication
- The MCP server operates in a trusted local environment
- It allows AI agents to autonomously connect without prompting for credentials
- The password is the hub's device ID, printed on the physical device
