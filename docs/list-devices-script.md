# Device Listing Script

## Overview
The `list-all-devices.ts` script provides a comprehensive view of all Plugwise devices across all configured hubs. It organizes devices by type and displays detailed information in a clear, easy-to-read format.

## Usage

```bash
npx tsx scripts/list-all-devices.ts
```

Or if made executable:
```bash
./scripts/list-all-devices.ts
```

## Features

### Multi-Hub Support
- Automatically scans all hubs configured in `.env`
- Tests each hub independently
- Continues scanning even if one hub fails
- Provides per-hub and overall statistics

### Device Organization
Devices are grouped by their device class for easy navigation:
- Gateway devices
- Thermostats and temperature sensors
- Radiator valves
- Switches and relays
- Zones
- Other device types

### Device Information Displayed

For each device, the script shows:
- **Name**: Human-readable device name
- **ID**: Unique device identifier
- **Model**: Vendor name and model (if available)
- **MAC Address**: Zigbee MAC address (if applicable)
- **Current State**: 
  - Temperature readings
  - Thermostat setpoints
  - Hot water temperature
  - Outdoor temperature
  - Control state (heating/cooling/idle)
  - Climate mode
- **Switch States**: On/off status for controllable switches
- **Capabilities**: List of device features
- **Location**: Physical location (if configured)

### Statistics

Per hub:
- Total device count
- Number of temperature sensors
- Number of thermostats
- Number of switches
- Heating/cooling/idle status counts
- Temperature range (min/max/average)

Overall:
- Total hubs scanned (successful/failed)
- Total devices across all hubs
- Hub-by-hub device counts

## Output Format

### Example Output

```
🔍 Plugwise Device Scanner - All Hubs

📡 Found 2 hub(s) configured:
   • HUB1: 192.168.178.235
   • HUB2: 192.168.178.218

════════════════════════════════════════════════════════════════════════
🏠 HUB1: 192.168.178.235
════════════════════════════════════════════════════════════════════════

⚡ Connecting...
✅ Connected: Plugwise Gateway (smile_open_therm v3.7.8)
📦 Total Devices: 14

🌐 GATEWAY (1)
────────────────────────────────────────────────────────────────────────
  📌 Gateway
     ID: 7018262509d64bf2be3bb664967921f1
     🔌 Switches: 
     💡 Capabilities: 🔌 Switch

🔥 THERMOSTATIC RADIATOR VALVE (2)
────────────────────────────────────────────────────────────────────────
  📌 Tom/Floor 000D6F0018441EDA
     ID: a4d8474af1284641a2192cb6022d222c
     🌡️  Temperature: 17.02°C
     🎯 Setpoint: 7°C
     💡 Capabilities: 🌡️ Temperature, 🎯 Thermostat, 🔌 Switch

❓ VALVE ACTUATOR (2)
────────────────────────────────────────────────────────────────────────
  📌 ZigBee Device 54EF441000BF7B28
     ID: 83b3b1250294494ca41a98d1dccaa50b
     🔌 Switches: relay: ❌ OFF
     💡 Capabilities: 🔌 Switch

❓ ZONE (5)
────────────────────────────────────────────────────────────────────────
  📌 Woonkamer
     ID: 2b763b0903ad4c0697669b7d3982a005
     🌡️  Temperature: 19.9°C
     🎯 Setpoint: 17°C
     💡 Capabilities: 🌡️ Temperature, 🎯 Thermostat, � Switch

  📌 Home
     ID: 2776fa454fb94ac087767c694546ab93
     🌤️  Outdoor: 13.56°C
     💡 Capabilities: 🔌 Switch, 🌤️ Outdoor Temp

📊 ZONE THERMOMETER (1)
────────────────────────────────────────────────────────────────────────
  📌 Jip 84BA20FFFED23F42
     ID: bad42cf8d59548b3be468ae637fc3d1c
     🌡️  Temperature: 18.97°C
     🎯 Setpoint: 15°C
     💡 Capabilities: 🌡️ Temperature, 🎯 Thermostat, 🔌 Switch

📊 HUB1 Statistics:
────────────────────────────────────────────────────────────────────────
   Total Devices: 14
   Temperature Sensors: 8
   Thermostats: 9
   Switches: 14
   🌡️  Temperature Range: 17.02°C - 19.9°C (avg: 18.5°C)

════════════════════════════════════════════════════════════════════════
📊 Overall Summary
════════════════════════════════════════════════════════════════════════
Hubs Scanned: 2/2 successful
Total Devices Found: 16

Hub Details:
   ✅ HUB1: Plugwise Gateway - 14 devices
   ✅ HUB2: Plugwise Gateway - 2 devices

🎉 All hubs scanned successfully!
```

## Device Type Icons

The script uses intuitive icons for different device types:
- 🌐 Gateway
- 🌡️ Thermostat
- 🎯 Zone Thermostat
- 📊 Zone Thermometer
- 🔥 Thermostatic Radiator Valve
- 💧 Central Heating Pump
- 🏠 Heater Central
- 🔌 Switch
- ⚡ Relay
- 📡 Sensor
- ❓ Unknown/Other

## Capability Icons

- 🌡️ Temperature sensor
- 🎯 Thermostat control
- 🔌 Switch/relay
- 🔒 Lock
- ⚙️ Regulation mode
- 📅 Schedule support
- 🚿 Hot water temperature
- 🌤️ Outdoor temperature

## Configuration

Uses the same `.env` configuration as other scripts:

```env
HUB1=<hub_id>
HUB1IP=<ip_address>
HUB2=<hub_id>
HUB2IP=<ip_address>
```

## Use Cases

- **Device Inventory**: Quick overview of all devices across all hubs
- **Troubleshooting**: Identify which devices are connected and their status
- **Planning**: Understand your Plugwise ecosystem before making changes
- **Monitoring**: Check current states of all devices at once
- **Documentation**: Generate a snapshot of your system configuration

## Error Handling

- Continues scanning remaining hubs if one fails
- Shows clear error messages for failed connections
- Reports which hubs failed in the final summary
- Exits with error code if any hub fails (for scripting purposes)

## Related Scripts

- `test-temperature-tools.ts`: Focused testing of temperature sensor devices
- `test-mcp-server.js`: Test MCP server functionality
- `test-autoload.js`: Test automatic hub discovery
- `test-network-scan.js`: Scan network for Plugwise hubs

## Technical Details

### Implementation
- Written in TypeScript using the PlugwiseClient
- Uses async/await for clean asynchronous code
- Groups devices using Map data structure for efficient organization
- Calculates statistics in real-time during scanning

### Dependencies
- `plugwise-client`: Core Plugwise API client
- `dotenv`: Environment variable management
- `tsx`: TypeScript execution

### Performance
- Scans hubs sequentially to avoid overwhelming network
- Efficient grouping and sorting algorithms
- Minimal API calls (one per hub)
