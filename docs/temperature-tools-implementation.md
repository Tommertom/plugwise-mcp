# Temperature Reading Tools - Implementation Summary

## Overview

This document describes the newly implemented temperature reading tools in the Plugwise MCP server, based on the Python Plugwise API reference.

## New Tools Implemented

### 1. `get_temperature`
**Description**: Get current room temperature and setpoint for a specific thermostat or zone.

**Input Parameters**:
- `device_id` (string): ID of the device/zone to read temperature from

**Returns**:
```typescript
{
  success: boolean;
  data?: {
    device_id: string;
    device_name: string;
    current_temperature?: number;      // Current measured room temperature in °C
    target_setpoint?: number;          // Target temperature setpoint in °C
    setpoint_low?: number;             // Heating setpoint for heat pump systems
    setpoint_high?: number;            // Cooling setpoint for heat pump systems
    control_state?: string;            // "idle", "heating", "cooling", "preheating"
    climate_mode?: string;             // "heat", "cool", "auto", etc.
  };
  error?: string;
}
```

**Usage Example**:
```json
{
  "device_id": "3cb70739631c4d17a86b8b12e8a5161b"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "device_id": "3cb70739631c4d17a86b8b12e8a5161b",
    "device_name": "Living Room",
    "current_temperature": 21.5,
    "target_setpoint": 22.0,
    "control_state": "heating",
    "climate_mode": "heat"
  }
}
```

---

### 2. `get_all_temperatures`
**Description**: Get current temperatures and setpoints for all thermostats and zones in the system.

**Input Parameters**: None

**Returns**:
```typescript
{
  success: boolean;
  data?: Array<{
    device_id: string;
    device_name: string;
    device_class: string;
    current_temperature?: number;
    target_setpoint?: number;
    setpoint_low?: number;
    setpoint_high?: number;
    control_state?: string;
    climate_mode?: string;
  }>;
  error?: string;
}
```

**Usage Example**: No parameters needed

**Response Example**:
```json
{
  "success": true,
  "data": [
    {
      "device_id": "3cb70739631c4d17a86b8b12e8a5161b",
      "device_name": "Living Room",
      "device_class": "thermostat",
      "current_temperature": 21.5,
      "target_setpoint": 22.0,
      "control_state": "heating",
      "climate_mode": "heat"
    },
    {
      "device_id": "e2f4322d57924fa090fbbc48b3a140dc",
      "device_name": "Bedroom",
      "device_class": "zone_thermostat",
      "current_temperature": 19.8,
      "target_setpoint": 20.0,
      "control_state": "idle",
      "climate_mode": "auto"
    }
  ]
}
```

---

### 3. `get_temperature_offset`
**Description**: Get the temperature offset (calibration) for a thermostat device.

**Input Parameters**:
- `device_id` (string): ID of the thermostat device

**Returns**:
```typescript
{
  success: boolean;
  data?: {
    device_id: string;
    device_name: string;
    offset?: number;         // Temperature offset in °C
    lower_bound?: number;    // Minimum allowed offset
    upper_bound?: number;    // Maximum allowed offset
    resolution?: number;     // Step size for offset changes
  };
  error?: string;
}
```

**Usage Example**:
```json
{
  "device_id": "3cb70739631c4d17a86b8b12e8a5161b"
}
```

**Response Example**:
```json
{
  "success": true,
  "data": {
    "device_id": "3cb70739631c4d17a86b8b12e8a5161b",
    "device_name": "Living Room",
    "offset": 0.5,
    "lower_bound": -2.0,
    "upper_bound": 2.0,
    "resolution": 0.1
  }
}
```

---

### 4. `set_temperature_offset`
**Description**: Set the temperature offset (calibration) for a thermostat device. This adjusts the measured temperature by a fixed offset.

**Input Parameters**:
- `device_id` (string): ID of the thermostat device
- `offset` (number): Temperature offset in °C (can be positive or negative)

**Returns**:
```typescript
{
  success: boolean;
  error?: string;
}
```

**Usage Example**:
```json
{
  "device_id": "3cb70739631c4d17a86b8b12e8a5161b",
  "offset": 1.0
}
```

**Response Example**:
```json
{
  "success": true
}
```

---

## API Implementation Details

### Data Structures

Based on the Python Plugwise API, temperature data is accessed through the following structure:

```typescript
// Current room temperature
device.sensors.temperature          // Measured room temperature in °C

// Target setpoints
device.thermostat.setpoint          // Regular thermostat setpoint
device.thermostat.setpoint_low      // Heating setpoint (heat pump)
device.thermostat.setpoint_high     // Cooling setpoint (heat pump)

// Temperature offset
device.temperature_offset.setpoint  // Current offset value
device.temperature_offset.lower_bound
device.temperature_offset.upper_bound
device.temperature_offset.resolution

// State information
device.control_state                // "idle", "heating", "cooling", "preheating"
device.climate_mode                 // "heat", "cool", "auto"
```

### Heat Pump Systems

For Anna devices with heat pump capability (heating + cooling):
- In **heating mode**: `setpoint_low` contains the target, `setpoint_high` = 30.0°C (MAX_SETPOINT)
- In **cooling mode**: `setpoint_high` contains the target, `setpoint_low` = 4.0°C (MIN_SETPOINT)
- Regular thermostats use only `setpoint`

### Device Classes with Temperature

The following device classes may have temperature sensors:
- `thermostat`
- `zone_thermostat`
- `zone_thermometer`
- `thermostatic_radiator_valve`
- `thermo_sensor`

## Client Method Added

### `setTemperatureOffset(deviceId: string, offset: number): Promise<void>`

Implementation in `plugwise-client.ts`:

```typescript
async setTemperatureOffset(deviceId: string, offset: number): Promise<void> {
    if (!this.connected) {
        throw new PlugwiseError('Not connected. Call connect() first.');
    }

    const offsetValue = offset.toString();
    const data = `<offset_functionality><offset>${offsetValue}</offset></offset_functionality>`;
    const uri = `/core/appliances;id=${deviceId}/offset;type=temperature_offset`;

    await this.request(uri, 'PUT', data);
}
```

This follows the Python API pattern:
```python
# Python reference
data = f"<offset_functionality><offset>{value}</offset></offset_functionality>"
uri = f"{APPLIANCES};id={dev_id}/offset;type=temperature_offset"
await self.call_request(uri, method="put", data=data)
```

## Testing

Run the test script to verify temperature reading functionality:

```bash
npm run build
tsx scripts/test-temperature-tools.ts
```

The test script will:
1. Connect to the Plugwise gateway
2. Retrieve all devices
3. Display all temperature readings
4. Show temperature statistics
5. Demonstrate individual device queries

## Files Modified

### New Tools Added
- `src/mcp/tools/temperature.tool.ts`
  - Added `get_temperature` tool
  - Added `get_all_temperatures` tool
  - Added `get_temperature_offset` tool
  - Added `set_temperature_offset` tool

### Client Updated
- `src/mcp/plugwise-client.ts`
  - Added `setTemperatureOffset()` method

### Test Scripts
- `scripts/test-temperature-tools.ts` (new)
  - Comprehensive test of temperature reading capabilities

### Documentation
- `docs/plugwise-python-api-reference.md` (created earlier)
  - Complete Python API reference for temperature operations
- `docs/temperature-tools-implementation.md` (this file)
  - Implementation details for the MCP tools

## Usage in MCP Client

When using these tools through the MCP protocol:

```javascript
// Get temperature for specific device
const result = await mcpClient.callTool('get_temperature', {
  device_id: '3cb70739631c4d17a86b8b12e8a5161b'
});

// Get all temperatures
const allTemps = await mcpClient.callTool('get_all_temperatures', {});

// Get temperature offset
const offset = await mcpClient.callTool('get_temperature_offset', {
  device_id: '3cb70739631c4d17a86b8b12e8a5161b'
});

// Set temperature offset
await mcpClient.callTool('set_temperature_offset', {
  device_id: '3cb70739631c4d17a86b8b12e8a5161b',
  offset: 1.0
});
```

## Key Features

1. **Read Current Temperatures**: Get the actual measured room temperature from any thermostat or temperature sensor
2. **Read Setpoints**: Get the target temperature that the thermostat is trying to reach
3. **Heat Pump Support**: Handles both heating and cooling setpoints for heat pump systems
4. **Batch Operations**: Get all temperatures from all devices in a single call
5. **Calibration**: Read and adjust temperature offsets for sensor calibration
6. **State Information**: Get control state (idle/heating/cooling) and climate mode

## Notes

- All temperatures are in Celsius (°C)
- The API uses device/entity IDs (UUIDs) to identify specific devices
- For location-based operations (setting temperature), use `location_id`
- For device-based operations (reading sensors), use `device_id`
- Always check if a device supports temperature offset before trying to set it

## References

- Python Plugwise Repository: https://github.com/plugwise/python-plugwise
- Python API Documentation: `docs/plugwise-python-api-reference.md`
- Home Assistant Plugwise Integration: https://github.com/home-assistant/core/tree/dev/homeassistant/components/plugwise
