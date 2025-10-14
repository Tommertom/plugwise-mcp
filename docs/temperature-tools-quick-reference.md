# MCP Server Temperature Tools - Quick Reference

## New Temperature Reading Tools

### 📊 Summary of Available Tools

| Tool Name | Purpose | Input | Output |
|-----------|---------|-------|--------|
| `get_temperature` | Read temperature for one device | `device_id` | Current temp, setpoint, state |
| `get_all_temperatures` | Read all temperatures | None | Array of all devices with temps |
| `get_temperature_offset` | Get calibration offset | `device_id` | Offset value and bounds |
| `set_temperature_offset` | Set calibration offset | `device_id`, `offset` | Success/error |

### 🔍 Quick Examples

#### Get Temperature for One Device
```javascript
{
  "device_id": "abc123..."
}
```
Returns:
```javascript
{
  "success": true,
  "data": {
    "device_name": "Living Room",
    "current_temperature": 21.5,  // °C
    "target_setpoint": 22.0,      // °C
    "control_state": "heating"
  }
}
```

#### Get All Temperatures
```javascript
{}  // No parameters
```
Returns array of all thermostats with their current readings.

#### Get/Set Temperature Offset
```javascript
// Get offset
{ "device_id": "abc123..." }

// Set offset (adjust by +1.0°C)
{ "device_id": "abc123...", "offset": 1.0 }
```

## 🌡️ Understanding Temperature Data

### Data Structure
```typescript
{
  // CURRENT TEMPERATURE (what the sensor reads)
  sensors.temperature: 21.5°C
  
  // TARGET TEMPERATURE (what you want)
  thermostat.setpoint: 22.0°C
  
  // For heat pumps with heating+cooling:
  thermostat.setpoint_low: 20.0°C   // heating target
  thermostat.setpoint_high: 25.0°C  // cooling target
  
  // STATE
  control_state: "heating" | "cooling" | "idle" | "preheating"
  climate_mode: "heat" | "cool" | "auto"
}
```

### Device Classes with Temperature
- `thermostat` - Main thermostat
- `zone_thermostat` - Zone/room thermostat
- `zone_thermometer` - Temperature sensor only
- `thermostatic_radiator_valve` - Radiator valve with sensor

## 🛠️ Implementation Details

### Files Modified
```
src/mcp/tools/temperature.tool.ts
  ✅ get_temperature
  ✅ get_all_temperatures  
  ✅ get_temperature_offset
  ✅ set_temperature_offset

src/mcp/plugwise-client.ts
  ✅ setTemperatureOffset() method

scripts/test-temperature-tools.ts
  ✅ Test script

docs/
  ✅ plugwise-python-api-reference.md (API reference)
  ✅ temperature-tools-implementation.md (detailed docs)
  ✅ temperature-tools-quick-reference.md (this file)
```

### API Endpoints Used
```typescript
// Read: GET /core/domain_objects
// Parse entities, sensors, thermostat data

// Write: PUT /core/appliances;id={id}/offset;type=temperature_offset
// XML: <offset_functionality><offset>1.0</offset></offset_functionality>
```

## 🧪 Testing

### Run the Test Script
```bash
# Build project
npm run build

# Run temperature tools test
tsx scripts/test-temperature-tools.ts
```

### Test Output Includes
- ✅ Connection to gateway
- ✅ List all devices with temperature sensors
- ✅ Display current temperatures and setpoints
- ✅ Show temperature statistics (min/max/average)
- ✅ Display heating/cooling/idle counts
- ✅ Individual device query example

## 📋 Common Use Cases

### 1. Monitor Room Temperature
```javascript
const result = await callTool('get_temperature', {
  device_id: 'living-room-thermostat-id'
});
console.log(`Living room: ${result.data.current_temperature}°C`);
```

### 2. Check All Rooms
```javascript
const temps = await callTool('get_all_temperatures', {});
temps.data.forEach(room => {
  console.log(`${room.device_name}: ${room.current_temperature}°C`);
});
```

### 3. Calibrate Sensor
```javascript
// If sensor reads 0.5°C too high, apply -0.5°C offset
await callTool('set_temperature_offset', {
  device_id: 'sensor-id',
  offset: -0.5
});
```

### 4. Check Heating Status
```javascript
const temps = await callTool('get_all_temperatures', {});
const heating = temps.data.filter(d => d.control_state === 'heating');
console.log(`${heating.length} rooms currently heating`);
```

## 🔑 Key Points

1. **Read-Only vs Write Operations**
   - `get_temperature` / `get_all_temperatures` - Read current values
   - `set_temperature_offset` - Write calibration offset
   - Use `set_temperature` tool (existing) to change setpoint

2. **Device vs Location IDs**
   - Temperature reading uses `device_id`
   - Setting temperature setpoint uses `location_id`

3. **Temperature Units**
   - All temperatures in Celsius (°C)

4. **Heat Pump Systems**
   - May have both heating and cooling setpoints
   - Check for `setpoint_low` and `setpoint_high`

5. **Offset/Calibration**
   - Not all devices support temperature offset
   - Check `temperature_offset` exists before using
   - Typical range: -2°C to +2°C

## 🐛 Troubleshooting

### Device Not Found
```javascript
{
  "success": false,
  "error": "Device abc123 not found"
}
```
**Solution**: Use `get_devices` to list all available device IDs.

### No Temperature Data
Some devices may not have `sensors.temperature` or `thermostat` data.
**Solution**: Check `dev_class` to ensure it's a temperature device.

### Offset Not Supported
```javascript
{
  "success": false,
  "error": "Device does not support temperature offset"
}
```
**Solution**: Not all thermostats support calibration. Check with `get_temperature_offset` first.

## 📚 Related Documentation

- **Complete API Reference**: `docs/plugwise-python-api-reference.md`
- **Implementation Guide**: `docs/temperature-tools-implementation.md`
- **Python Source**: https://github.com/plugwise/python-plugwise

## 🚀 Next Steps

1. Build the project: `npm run build`
2. Test with real gateway: `tsx scripts/test-temperature-tools.ts`
3. Integrate into your MCP client
4. Start reading temperatures!

---

**Version**: 1.0.0  
**Created**: Based on python-plugwise v1.8.0+  
**Last Updated**: 2025-10-13
