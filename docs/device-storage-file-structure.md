# Device Storage File Structure

## Storage Location
```
mcp_data/
└── plugwise/
    ├── devices/          ← Device files stored here
    │   ├── {hubName}_{deviceId}.json
    │   ├── {hubName}_{deviceId}.json
    │   └── ...
    └── hubs/             ← Hub files stored here
        ├── {hubName}.json
        └── ...
```

## File Naming Pattern

```
{hubName}_{deviceId}.json
    │         │
    │         └─── Unique device identifier
    └───────────── Hub name/identifier
```

### Examples:
- `glmpttxf_a1b2c3d4.json`
- `glmpttxf_e5f6g7h8.json`
- `glmpuuxg_m3n4o5p6.json`

## Data Flow

```
┌─────────────────────┐
│   get_devices Tool  │
│   (device.tool.ts)  │
└──────────┬──────────┘
           │
           │ calls client.getDevices()
           │
           ▼
┌─────────────────────┐
│  PlugwiseClient     │
│  Fetches from Hub   │
└──────────┬──────────┘
           │
           │ returns entities
           │
           ▼
┌─────────────────────────────┐
│  DeviceStorageService       │
│  saveDevices(hubName, ...)  │
└──────────┬──────────────────┘
           │
           │ For each device:
           │
           ▼
┌─────────────────────────────────────┐
│  Create individual JSON file:       │
│  mcp_data/plugwise/devices/         │
│    {hubName}_{deviceId}.json        │
│                                      │
│  Contents:                          │
│  {                                  │
│    "hubName": "glmpttxf",          │
│    "deviceId": "a1b2c3d4",         │
│    "humanReadableName": "...",     │
│    "updatedAt": "2025-11-06...",   │
│    "device": { ... }               │
│  }                                  │
└─────────────────────────────────────┘
```

## Reading Devices

```
┌──────────────────────────┐
│  loadDevicesForHub()     │
│  Input: hubName          │
└──────────┬───────────────┘
           │
           │ 1. List all files in devices/
           │
           ▼
┌──────────────────────────┐
│  Filter files:           │
│  - Starts with {hubName}_│
│  - Ends with .json       │
└──────────┬───────────────┘
           │
           │ 2. Read each matching file
           │
           ▼
┌──────────────────────────┐
│  Parse JSON and extract  │
│  device object           │
└──────────┬───────────────┘
           │
           │ 3. Build array of devices
           │
           ▼
┌──────────────────────────┐
│  Return StoredDevice[]   │
│  + Update in-memory cache│
└──────────────────────────┘
```

## Example File Content

### File: `glmpttxf_abc123.json`

```json
{
  "hubName": "glmpttxf",
  "deviceId": "abc123",
  "humanReadableName": "Living Room Thermostat",
  "updatedAt": "2025-11-06T21:04:00.000Z",
  "device": {
    "id": "abc123",
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

## Key Advantages

| Aspect | Previous (Single File) | Current (Individual Files) |
|--------|------------------------|---------------------------|
| File per hub | 1 file = all devices | 1 file = 1 device |
| Identification | Must open file | Filename shows hub + device |
| Updates | Rewrite entire file | Update only changed device |
| Scalability | Slower with many devices | Fast with any number |
| VCS tracking | Large diffs | Precise diffs |
| Human browsing | Need to parse JSON | Filename + humanReadableName |
