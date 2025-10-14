# Plugwise Test Scripts

This directory contains comprehensive test scripts for the Plugwise MCP Server. All test scripts are **read-only** and do not modify any device states.

## Overview

The test scripts are designed to validate all read-only functionality of the Plugwise MCP server, including:

- Network discovery
- Gateway connection
- Device discovery
- Sensor reading
- Thermostat state reading
- Switch state reading
- Device availability checking

## Test Scripts

### `test-read-only.ts`

The main read-only test suite that comprehensively tests all read operations.

**Features:**
- Network scanning for Plugwise hubs
- Gateway connection and information retrieval
- Device discovery and enumeration
- Sensor data reading (temperature, humidity, valve position, etc.)
- Thermostat state reading
- Switch state reading
- Device availability checking
- Mock mode support for testing without real hardware

**Usage:**

```bash
# With automatic device discovery
npm run test:read-only

# With manual gateway configuration
PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:read-only

# With mock mode (no real devices required)
npm run test:read-only -- --mock

# Or using environment variable
MOCK_DEVICES=true npm run test:read-only
```

**Environment Variables:**
- `PLUGWISE_HOST`: Manual gateway IP address
- `PLUGWISE_PASSWORD`: Gateway password
- `MOCK_DEVICES`: Set to `true` to enable mock mode

### `test-features.ts`

Detailed feature testing that validates individual MCP tools and protocol features.

**Features:**
- MCP protocol validation (tool listing, schemas, descriptions)
- Individual tool testing (scan_network, connect, get_devices)
- Data structure validation
- Data consistency testing across multiple reads
- Error handling verification
- Performance testing
- Mock mode support

**Usage:**

```bash
# With manual gateway configuration
PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:features

# With mock mode (no real devices required)
npm run test:features -- --mock

# Or using environment variable
MOCK_DEVICES=true npm run test:features
```

**Tests Performed:**
- MCP Protocol Features
  - List available tools
  - Validate tool schemas
  - Check tool descriptions
  - Verify input schemas
- Network Scanning Tool
  - Scan with default timeout
  - Scan with custom timeout
  - Verify hub data structure
- Gateway Connection Tool
  - Connect to gateway
  - Verify gateway info structure
  - Get gateway info standalone
- Device Retrieval Tool
  - Get all devices
  - Verify entity structure
  - Check entity types
  - Verify sensor data
- Data Consistency
  - Multiple device reads consistency
  - Gateway info consistency
- Error Handling (real mode only)
  - Invalid host error
  - Invalid password error
- Performance
  - Device retrieval speed
  - Connection speed

### `test-utils.ts`

Shared utilities for MCP server testing.

**Exports:**
- `makeStdioRequest()`: Make JSON-RPC requests via stdio
- `initializeMcpConnection()`: Initialize MCP protocol connection
- `listTools()`: List available MCP tools
- `callTool()`: Call an MCP tool
- `discoverHubs()`: Discover Plugwise hubs on the network
- `runTest()`: Helper for running individual tests with error handling
- `formatTestResult()`: Format test results for console output
- `wait()`: Promise-based delay utility

## Test Structure

Each test script follows this pattern:

1. **Server Startup**: Spawn the MCP server in stdio mode
2. **Initialization**: Initialize MCP connection with protocol handshake
3. **Discovery**: Discover or configure gateway connection
4. **Test Execution**: Run a series of read-only tests
5. **Cleanup**: Gracefully shutdown the MCP server

### Test Categories

#### Network Scanning Tests
- Scan network for Plugwise hubs
- Identify available gateways
- Report hub details (name, model, host)

#### Gateway Connection Tests
- Connect to gateway
- Retrieve gateway information
- Verify connection status
- Read gateway type, model, and version

#### Device Discovery Tests
- Get all devices from gateway
- Count total entities
- Analyze device types
- List device classes

#### Sensor Reading Tests
- Read temperature sensors
- Read humidity sensors
- Read valve position sensors
- Read other sensor types
- Calculate statistics (average, min, max)

#### Thermostat Reading Tests
- Read thermostat setpoints
- Read temperature bounds
- Read active presets
- List preset distribution

#### Switch Reading Tests
- Read relay states
- Count on/off switches
- Identify controllable devices

#### Device Availability Tests
- Check device online status
- Report unavailable devices
- Calculate availability statistics

## Mock Mode

All test scripts support mock mode for testing without real hardware:

```bash
npm run test:read-only -- --mock
```

In mock mode:
- Network scanning returns simulated hubs
- Gateway connection returns mock gateway info
- Device discovery returns sample devices with various types
- All sensor readings return realistic mock data

This is useful for:
- Testing the test scripts themselves
- Developing without hardware access
- CI/CD pipeline integration
- Demonstration purposes

## Output Format

Test results are displayed with:
- ✅ for passing tests
- ❌ for failing tests
- Detailed information about discovered devices
- Statistics and summaries
- Error messages for failures

Example output:
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

🔍 Testing Network Scanning

✅ Scan Network for Hubs
   Found 1 hub(s)
   First hub: Adam

🔌 Testing Gateway Connection

✅ Connect to Gateway
   Gateway: Adam
   Type: thermostat
   Model: Adam
   Version: 3.7.6

📱 Testing Device Discovery

✅ Get All Devices
   Total entities: 15
   Gateway ID: abc123

✅ Analyze Device Types
   Device types found:
     - zone: 5
     - valve: 8
     - gateway: 1
     - heater_central: 1

[... more test results ...]

╔══════════════════════════════════════════╗
║    Read-Only Tests Complete! ✅          ║
╚══════════════════════════════════════════╝
```

## Safety

**Important**: All test scripts in this directory are designed to be **read-only**. They will:
- ✅ Discover devices
- ✅ Read sensor values
- ✅ Check device states
- ✅ Retrieve gateway information

They will **NOT**:
- ❌ Change temperature setpoints
- ❌ Toggle switches
- ❌ Modify presets
- ❌ Change gateway modes
- ❌ Reboot devices
- ❌ Delete notifications

This makes them safe to run at any time without affecting your Plugwise system.

## Requirements

- Node.js 18 or later
- TypeScript 5.x
- Built MCP server (`npm run build`)
- Plugwise gateway on the network (or mock mode)
- Gateway password (for real hardware testing)

## Troubleshooting

### No devices found
- Ensure gateway is powered on and connected to network
- Check that computer is on same network as gateway
- Verify multicast is enabled on network
- Try manual configuration with `PLUGWISE_HOST` and `PLUGWISE_PASSWORD`
- Use mock mode to test without hardware

### Connection timeout
- Check gateway IP address is correct
- Verify password is correct
- Ensure gateway HTTP API is accessible (port 80)
- Check firewall settings

### Server startup fails
- Run `npm run build` first to compile TypeScript
- Check that port 3000 is not in use
- Verify all dependencies are installed (`npm install`)

## Contributing

When adding new test scripts:
1. Follow the existing pattern from `test-read-only.ts`
2. Use shared utilities from `test-utils.ts`
3. Support mock mode for testing without hardware
4. Only test read-only operations
5. Add proper error handling and logging
6. Update this README with new test descriptions
