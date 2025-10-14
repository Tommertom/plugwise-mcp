# Quick Test Guide

## Running Tests

### Quick Start (Mock Mode)
```bash
# Test all read operations (recommended for first run)
npm run test:read-only -- --mock

# Test individual features and protocol
npm run test:features -- --mock
```

### With Real Hardware

#### Prerequisites
1. Plugwise gateway powered on and connected to network
2. Computer on same network as gateway
3. Gateway password (Smile ID from bottom of device)

#### Option 1: Automatic Discovery
```bash
# Set password in .env file
echo "HUB1=your-gateway-password" >> .env

# Run tests
npm run test:read-only
npm run test:features
```

#### Option 2: Manual Configuration
```bash
# Run with environment variables
PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:read-only
PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:features
```

## Test Scripts Overview

| Script | Purpose | Duration | Use Case |
|--------|---------|----------|----------|
| `test:read-only` | Comprehensive read operations | ~30s | Full system validation |
| `test:features` | Detailed protocol testing | ~20s | Development & debugging |
| `test:all` | Legacy HTTP-based tests | ~60s | Alternative testing method |

## What Gets Tested

### Read-Only Tests
- ✅ Network scanning
- ✅ Gateway connection
- ✅ Device discovery
- ✅ Sensor reading (temperature, humidity, etc.)
- ✅ Thermostat states
- ✅ Switch states
- ✅ Device availability

### Features Tests
- ✅ MCP protocol compliance
- ✅ Tool schemas and descriptions
- ✅ Data structure validation
- ✅ Data consistency
- ✅ Error handling
- ✅ Performance metrics

## Safety

All test scripts are **read-only** and will **NOT**:
- ❌ Change temperature setpoints
- ❌ Toggle switches
- ❌ Modify presets
- ❌ Change gateway modes
- ❌ Reboot devices

Safe to run at any time!

## Troubleshooting

### No devices found
```bash
# Use mock mode to test without hardware
npm run test:read-only -- --mock

# Or specify gateway manually
PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:read-only
```

### Connection timeout
- Verify gateway IP is correct
- Check gateway password
- Ensure gateway is powered on
- Check network connectivity

### Build errors
```bash
# Rebuild the project
npm run build

# Reinstall dependencies
npm install
```

## Example Output

### Successful Test Run
```
╔══════════════════════════════════════════╗
║  Plugwise Read-Only Test Suite          ║
║  Network, Devices, Sensors, States       ║
╚══════════════════════════════════════════╝

🚀 Starting Plugwise MCP Server in stdio mode...
🔌 Initializing MCP connection...
🔍 Discovering Plugwise hubs on the network...

✅ Found 1 hub(s)
   Using hub: Adam

✅ Scan Network for Hubs
   Found 1 hub(s)

✅ Connect to Gateway
   Gateway: Adam
   Type: thermostat

✅ Get All Devices
   Total entities: 15

╔══════════════════════════════════════════╗
║    Read-Only Tests Complete! ✅          ║
╚══════════════════════════════════════════╝
```

## Advanced Usage

### Custom Timeout
```typescript
// In test script
const hubs = await discoverHubs(mcpProcess, 10000); // 10 second timeout
```

### Debugging
```bash
# View detailed server logs
DEBUG=* npm run test:read-only

# Check for errors
npm run test:read-only 2>&1 | tee test-output.log
```

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Run tests
  run: npm run test:read-only -- --mock
  
- name: Run feature tests  
  run: npm run test:features -- --mock
```

## Need Help?

1. Check the [main documentation](./test-scripts.md)
2. Review the [README](../README.md)
3. Open an issue on GitHub
