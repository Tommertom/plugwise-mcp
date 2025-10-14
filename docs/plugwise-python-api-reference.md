# Plugwise Python API Reference - Temperature Reading

This document provides information about the Python Plugwise API for reading thermostat set temperatures and room temperatures, based on the [python-plugwise](https://github.com/plugwise/python-plugwise) repository.

## Overview

The python-plugwise module provides an API for interfacing with Plugwise devices, particularly networked devices like Adam, Anna (Smile), and P1 gateways. The API is used by the Home Assistant Plugwise integration.

## Key Data Structures

### Entity Data Structure

Device data is returned as a `GwEntityData` TypedDict with the following relevant fields for temperature:

```typescript
class GwEntityData(TypedDict, total=False):
    # Thermostat actuator data
    thermostat: ActuatorData
    
    # Sensor data 
    sensors: SmileSensors
    
    # Binary sensors
    binary_sensors: SmileBinarySensors
    
    # State information
    control_state: str  # "idle", "heating", "cooling", "preheating"
    climate_mode: str   # "heat", "cool", "auto", etc.
```

### ActuatorData - Thermostat Setpoints

The `thermostat` field contains setpoint information:

```typescript
class ActuatorData(TypedDict, total=False):
    lower_bound: float      # Minimum allowed setpoint
    resolution: float       # Step size for setpoint changes
    setpoint: float         # Current target temperature setpoint
    setpoint_high: float    # Cooling setpoint (for heat pump systems)
    setpoint_low: float     # Heating setpoint (for heat pump systems)
    upper_bound: float      # Maximum allowed setpoint
```

**Note:** For Anna devices with heat pump (heating + cooling capability):
- In **heating mode**: `setpoint_low` contains the target temperature, `setpoint_high` is set to `MAX_SETPOINT` (30.0°C)
- In **cooling mode**: `setpoint_high` contains the target temperature, `setpoint_low` is set to `MIN_SETPOINT` (4.0°C)
- For regular thermostats: Only `setpoint` is used

### SmileSensors - Current Measurements

The `sensors` field contains actual measured values:

```typescript
class SmileSensors(TypedDict, total=False):
    // Room/Zone Temperature Sensors
    temperature: float                              // Current room temperature (°C)
    
    // Thermostat-related sensors
    setpoint: float                                 // Target setpoint (mirrored from thermostat)
    setpoint_high: float                           // Cooling target (for systems with cooling)
    setpoint_low: float                            // Heating target (for systems with cooling)
    
    // Other temperature sensors
    outdoor_temperature: float                      // Outdoor temperature (°C)
    outdoor_air_temperature: float                  // Outdoor air temp from heat pump (°C)
    dhw_temperature: float                         // Domestic hot water temperature (°C)
    water_temperature: float                       // Boiler water temperature (°C)
    return_temperature: float                      // Return water temperature (°C)
    intended_boiler_temperature: float             // Target boiler temperature (°C)
    temperature_difference: float                  // Temperature differential (°)
    
    // Heat pump specific
    cooling_activation_outdoor_temperature: float  // Outdoor temp to activate cooling (°C)
    cooling_deactivation_threshold: float         // Threshold to deactivate cooling (°C)
    
    // Other sensors
    valve_position: int                           // Valve position (%)
    modulation_level: int                         // Modulation level (%)
    battery: int                                  // Battery level (%)
    humidity: float                               // Humidity
    illuminance: float                            // Light level (lux)
}
```

## Reading Temperature Data

### Main API Class

The main entry point is the `Smile` class:

```python
from plugwise import Smile

# Initialize connection
smile = Smile(
    host="<gateway_ip>",
    password="<smile_id>",
    username="smile",  # Default username
    port=80,           # Default port
    timeout=10         # Default timeout
)

# Connect to the gateway
await smile.connect()

# Get all device data
devices = await smile.async_update()
```

### Accessing Device Data

The `async_update()` method returns a dictionary where:
- Keys are device/entity IDs (UUID strings)
- Values are `GwEntityData` dictionaries containing all device information

```python
# Get all devices
devices = await smile.async_update()

# Iterate through devices
for device_id, device_data in devices.items():
    # Check if device is a thermostat
    if device_data.get("dev_class") == "thermostat":
        # Get current room temperature
        current_temp = device_data["sensors"].get("temperature")
        
        # Get setpoint (target temperature)
        if "thermostat" in device_data:
            thermostat = device_data["thermostat"]
            
            # For regular thermostats
            if "setpoint" in thermostat:
                target_temp = thermostat["setpoint"]
            
            # For heat pump systems with cooling
            if "setpoint_low" in thermostat and "setpoint_high" in thermostat:
                heating_target = thermostat["setpoint_low"]
                cooling_target = thermostat["setpoint_high"]
        
        # Get control state
        control_state = device_data.get("control_state")  # "idle", "heating", "cooling"
        
        print(f"Device: {device_data.get('name')}")
        print(f"Current Temperature: {current_temp}°C")
        print(f"Target Temperature: {target_temp}°C")
        print(f"State: {control_state}")
```

## Example: Reading Thermostat Data

### Simple Example

```python
async def read_thermostat_data():
    smile = Smile(host="192.168.1.100", password="abcd1234")
    await smile.connect()
    
    devices = await smile.async_update()
    
    for device_id, device in devices.items():
        if device.get("dev_class") == "thermostat":
            # Current room temperature
            room_temp = device["sensors"].get("temperature")
            
            # Target setpoint
            setpoint = device["thermostat"].get("setpoint")
            
            # Device name
            name = device.get("name", "Unknown")
            
            print(f"{name}: {room_temp}°C (target: {setpoint}°C)")
    
    await smile.close_connection()
```

### Advanced Example with Heat Pump

```python
async def read_heatpump_thermostat():
    smile = Smile(host="192.168.1.100", password="abcd1234")
    await smile.connect()
    
    devices = await smile.async_update()
    
    for device_id, device in devices.items():
        if device.get("dev_class") != "thermostat":
            continue
            
        name = device.get("name", "Unknown")
        sensors = device.get("sensors", {})
        thermostat = device.get("thermostat", {})
        
        # Current room temperature
        current_temp = sensors.get("temperature")
        
        # Check for heat pump with cooling capability
        if "setpoint_low" in thermostat and "setpoint_high" in thermostat:
            heating_setpoint = thermostat["setpoint_low"]
            cooling_setpoint = thermostat["setpoint_high"]
            
            # Check current mode
            control_state = device.get("control_state", "idle")
            cooling_enabled = device.get("binary_sensors", {}).get("cooling_enabled", False)
            
            print(f"{name}:")
            print(f"  Current: {current_temp}°C")
            print(f"  Heating Target: {heating_setpoint}°C")
            print(f"  Cooling Target: {cooling_setpoint}°C")
            print(f"  State: {control_state}")
            print(f"  Cooling Available: {cooling_enabled}")
        else:
            # Regular thermostat
            setpoint = thermostat.get("setpoint")
            print(f"{name}: {current_temp}°C (target: {setpoint}°C)")
    
    await smile.close_connection()
```

## Constants and Configuration

### Temperature Constants

```python
from plugwise.constants import (
    TEMP_CELSIUS,      # "°C"
    DEFAULT_PW_MAX,    # 30.0 - Maximum setpoint
    DEFAULT_PW_MIN,    # 4.0 - Minimum setpoint
    MAX_SETPOINT,      # 30.0
    MIN_SETPOINT,      # 4.0
)
```

### Device Classes

```python
# Thermostat-related device classes
THERMOSTAT_CLASSES = (
    "thermostat",
    "thermostatic_radiator_valve",
    "thermo_sensor",
    "zone_thermometer",
    "zone_thermostat",
)
```

## Setting Temperature (Write API)

### Set Target Temperature

```python
# For regular thermostats
await smile.set_temperature(
    loc_id="<location_id>",  # Location/zone ID
    items={"setpoint": 21.5}  # Target temperature in °C
)

# For heat pump thermostats (heating mode)
await smile.set_temperature(
    loc_id="<location_id>",
    items={
        "setpoint_low": 20.0,      # Heating target
        "setpoint_high": 30.0      # Must be MAX_SETPOINT in heating mode
    }
)

# For heat pump thermostats (cooling mode)
await smile.set_temperature(
    loc_id="<location_id>",
    items={
        "setpoint_low": 4.0,       # Must be MIN_SETPOINT in cooling mode
        "setpoint_high": 23.0      # Cooling target
    }
)
```

### Set Temperature Offset

Some thermostats support a temperature offset for calibration:

```python
await smile.set_temperature_offset(
    dev_id="<device_id>",
    offset=1.0  # Offset in °C (can be positive or negative)
)
```

## Important Notes

1. **Location vs Device IDs**: 
   - Temperature setpoints are set using `location_id` (zone/room ID)
   - Current temperatures are read from device data using `device_id`

2. **Async Operations**: All API calls are asynchronous and must be awaited

3. **Connection Management**: Always close the connection when done:
   ```python
   await smile.close_connection()
   ```

4. **Error Handling**: The API may raise `PlugwiseError` or `ConnectionFailedError`:
   ```python
   from plugwise.exceptions import PlugwiseError, ConnectionFailedError
   
   try:
       await smile.set_temperature(loc_id, {"setpoint": 22.0})
   except PlugwiseError as e:
       print(f"Invalid operation: {e}")
   except ConnectionFailedError as e:
       print(f"Connection failed: {e}")
   ```

5. **Temperature Units**: All temperatures are in Celsius (°C)

6. **Update Frequency**: Call `async_update()` periodically to refresh data

## Data Flow Summary

```
Gateway (Adam/Anna/Smile)
    ↓
async_update()
    ↓
Dict[device_id, GwEntityData]
    ↓
GwEntityData {
    "sensors": {
        "temperature": <current_room_temp>  ← CURRENT TEMPERATURE IN ROOM
    },
    "thermostat": {
        "setpoint": <target_temp>           ← SET TEMPERATURE FOR THERMOSTAT
    }
}
```

## References

- Repository: https://github.com/plugwise/python-plugwise
- Home Assistant Integration: https://github.com/home-assistant/core/tree/dev/homeassistant/components/plugwise
- PyPI Package: https://pypi.org/project/plugwise/

## Related Files in Repository

- `plugwise/__init__.py` - Main Smile class
- `plugwise/smile.py` - SmileAPI implementation
- `plugwise/constants.py` - Type definitions and constants
- `plugwise/data.py` - Data processing logic
- `plugwise/helper.py` - Helper functions for data extraction
