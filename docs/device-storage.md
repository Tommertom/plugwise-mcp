# Device Storage

## Overview

The Plugwise MCP server automatically stores device information when devices are scanned from a hub. This enables faster access to device lists and provides device information even when not actively connected to a hub.

## Storage Location

Device configurations are stored in the `mcp_data/plugwise/devices` directory, with one JSON file per hub.

```
mcp_data/
└── plugwise/
    └── devices/
        ├── hub1.json
        ├── hub2.json
        └── ...
```

## Directory Creation

The server automatically creates the `mcp_data/plugwise/devices` directory when it starts up if it doesn't already exist.

## Device File Format

Each hub's devices are stored as a JSON file named `{hubName}.json`:

```json
{
  "hubName": "MyHub",
  "updatedAt": "2025-11-05T22:00:00.000Z",
  "deviceCount": 3,
  "devices": [
    {
      "id": "device-id-1",
      "name": "Living Room Thermostat",
      "type": "thermostat",
      "dev_class": "thermostat",
      "hubName": "MyHub",
      "location": "Living Room",
      "model": "Anna",
      "available": true,
      "capabilities": {
        "hasTemperature": true,
        "hasSwitch": false,
        "hasPresets": true,
        "hasSensors": true
      }
    },
    {
      "id": "device-id-2",
      "name": "Bedroom Switch",
      "type": "switch",
      "dev_class": "relay",
      "hubName": "MyHub",
      "location": "Bedroom",
      "available": true,
      "capabilities": {
        "hasTemperature": false,
        "hasSwitch": true,
        "hasPresets": false,
        "hasSensors": false
      }
    }
  ]
}
```

## Stored Device Fields

Each device stores only the essential information needed for tool calls:

- **id**: Unique device identifier (required for device-specific tools)
- **name**: Human-readable device name
- **type**: Device type (thermostat, switch, sensor, etc.)
- **dev_class**: Device class from Plugwise API
- **hubName**: Which hub this device belongs to
- **location**: Physical location/room name
- **model**: Device model (if available)
- **available**: Whether device is currently available
- **capabilities**: Summary of device capabilities for quick reference

## Automatic Device Caching

Devices are automatically saved to storage when:

1. The `get_devices` tool is called
2. A connection is established and devices are retrieved

The device storage service:
- Extracts relevant device information
- Converts full device data to minimal stored format
- Saves to the appropriate hub's JSON file
- Updates the in-memory cache

## Loading Devices on Startup

When the server starts:

1. Checks for the `mcp_data/plugwise/devices` directory
2. Creates the directory if it doesn't exist
3. Loads all device JSON files
4. Populates the in-memory device cache
5. Includes device list in the server description for AI agents

## Server Description

Cached devices are included in the MCP server description, making them immediately available to AI agents:

```
Known devices (use get_devices to refresh):

Hub: MyHub
  - Living Room Thermostat in Living Room (thermostat) [ID: device-id-1]
  - Bedroom Switch in Bedroom (switch) [ID: device-id-2]
```

This allows AI agents to:
- Know which devices exist without scanning
- Understand device locations and types
- Have device IDs ready for tool calls
- Plan automation workflows based on available devices

## Benefits

1. **Faster Response**: Device information is available immediately without connecting to hub
2. **Better Context**: AI agents can see all devices in their initial context
3. **Persistent Knowledge**: Device information persists across server restarts
4. **Automatic Updates**: Devices are refreshed whenever `get_devices` is called
5. **Multi-Hub Support**: Each hub's devices are stored separately

## Device Capabilities

The storage service automatically detects and stores device capabilities:

- **hasTemperature**: Device has temperature sensor or thermostat control
- **hasSwitch**: Device has switchable relays or controls
- **hasPresets**: Device supports preset modes (comfort, away, etc.)
- **hasSensors**: Device has sensor readings (humidity, power, etc.)

These capabilities help AI agents understand what actions are possible with each device.

## Refreshing Device Data

To update stored device information:

1. Connect to the hub using the `connect` tool
2. Call the `get_devices` tool
3. Devices will be automatically re-scanned and saved

The `updatedAt` timestamp in each file shows when devices were last scanned.

## Use Cases for AI Agents

With cached device information, AI agents can:

- **Answer questions** about available devices without connecting
- **Plan workflows** based on device types and locations
- **Suggest automations** using known device capabilities
- **Execute commands** using pre-loaded device IDs
- **Understand topology** of multi-hub smart home setups
