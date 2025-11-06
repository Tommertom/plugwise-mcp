# Device Storage - Individual File Implementation

## Overview

The `get_devices` tool now stores each discovered Plugwise device as an individual JSON file in the `mcp_data/plugwise/devices/` folder. This provides better granularity and easier management of device information.

## File Naming Convention

Each device file follows the naming pattern:
```
{hubName}_{deviceId}.json
```

### Examples:
- `glmpttxf_a1b2c3d4.json` - Device `a1b2c3d4` on hub `glmpttxf`
- `glmpttxf_e5f6g7h8.json` - Device `e5f6g7h8` on hub `glmpttxf`
- `glmpuuxg_i9j0k1l2.json` - Device `i9j0k1l2` on hub `glmpuuxg`

## File Structure

Each device JSON file contains the following structure:

```json
{
  "hubName": "glmpttxf",
  "deviceId": "a1b2c3d4",
  "humanReadableName": "Living Room Thermostat",
  "updatedAt": "2025-11-06T10:30:45.123Z",
  "device": {
    "id": "a1b2c3d4",
    "name": "Living Room Thermostat",
    "type": "thermostat",
    "dev_class": "thermostat",
    "hubName": "glmpttxf",
    "location": "Living Room",
    "model": "Lisa",
    "available": true,
    "capabilities": {
      "hasTemperature": true,
      "hasSwitch": false,
      "hasPresets": true,
      "hasSensors": true
    }
  }
}
```

## Key Fields

### Top-Level Fields
- **hubName**: The name/ID of the Plugwise hub this device belongs to
- **deviceId**: The unique identifier of the device
- **humanReadableName**: The user-friendly name of the device
- **updatedAt**: ISO 8601 timestamp of when this file was last updated

### Device Object
- **id**: Unique device identifier (same as deviceId)
- **name**: Human-readable device name
- **type**: Device type classification
- **dev_class**: Device class from Plugwise API
- **hubName**: Reference to the parent hub
- **location**: Physical location of the device (if available)
- **model**: Device model name (e.g., "Lisa", "Tom", "Plug")
- **available**: Boolean indicating if device is currently available
- **capabilities**: Object describing device capabilities
  - **hasTemperature**: Can read/set temperature
  - **hasSwitch**: Has switching capability
  - **hasPresets**: Supports preset modes
  - **hasSensors**: Has sensor readings

## Implementation Details

### DeviceStorageService Changes

The `DeviceStorageService` has been updated with the following changes:

#### 1. `saveDevices()` Method
- Creates individual files for each device
- Uses naming convention: `{hubName}_{deviceId}.json`
- Stores hub name, device ID, and human-readable name at the top level
- Updates in-memory cache for quick access

#### 2. `loadDevicesForHub()` Method
- Scans the devices directory for files matching `{hubName}_*.json` pattern
- Loads all devices for a specific hub
- Populates in-memory cache

#### 3. `loadAllDevices()` Method
- Extracts hub names from filenames
- Groups devices by hub
- Returns a map of hub names to device arrays

## Benefits

### 1. **Granular Storage**
Each device is stored independently, making it easy to:
- Update individual device information
- Delete specific devices
- Track device-specific changes

### 2. **Easy Hub Identification**
The filename immediately shows which hub a device belongs to without opening the file.

### 3. **Human-Readable Names**
The `humanReadableName` field at the top level makes it easy to identify devices when browsing the directory.

### 4. **Scalability**
As the number of devices grows, individual files perform better than large monolithic files.

### 5. **Version Control Friendly**
Individual files make it easier to track changes in version control systems.

## Usage Example

When the `get_devices` tool is called on a connected hub, it will:

1. Retrieve all devices from the hub
2. For each device, create/update a file: `{hubName}_{deviceId}.json`
3. Store the hub name, device ID, human-readable name, and full device details
4. Update the in-memory cache for fast lookups

## Directory Structure Example

```
mcp_data/
└── plugwise/
    ├── devices/
    │   ├── glmpttxf_a1b2c3d4.json  (Living Room Thermostat)
    │   ├── glmpttxf_e5f6g7h8.json  (Kitchen Switch)
    │   ├── glmpttxf_i9j0k1l2.json  (Bedroom Sensor)
    │   ├── glmpuuxg_m3n4o5p6.json  (Bathroom Thermostat)
    │   └── glmpuuxg_q7r8s9t0.json  (Hallway Switch)
    └── hubs/
        ├── glmpttxf.json
        └── glmpuuxg.json
```

## Migration from Previous Format

The previous implementation stored all devices for a hub in a single file (`{hubName}.json`). The new implementation:

- Stores each device separately
- Maintains backward compatibility through the loading methods
- Provides better performance and organization

If you have existing device files in the old format, they will no longer be loaded. The next call to `get_devices` will create the new individual files.

## Code Changes

### File: `src/services/device-storage.service.ts`

Key changes:
1. Modified `saveDevices()` to create individual files
2. Updated `loadDevicesForHub()` to read individual files
3. Enhanced `loadAllDevices()` to extract hub names from filenames

### File: `src/mcp/tools/device.tool.ts`

No changes required - the tool continues to work as before, but now benefits from the improved storage mechanism.

## Testing

A test script is available at `scripts/test-device-storage.ts` that demonstrates:
- Saving multiple devices
- Loading devices for a specific hub
- Loading all devices from all hubs
- Finding specific devices by ID

To run the test (after including scripts in tsconfig):
```bash
npm run build
node dist/scripts/test-device-storage.js
```

## Notes

- The hub name is embedded in the filename for quick identification
- The device ID must be unique within a hub
- Files are automatically created/overwritten when `get_devices` is called
- The `updatedAt` timestamp tracks when device information was last refreshed
