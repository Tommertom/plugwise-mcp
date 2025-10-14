# Comprehensive Read-Only Test Suite

## Overview

The `test-all.ts` script provides comprehensive testing of all read-only MCP tools for the Plugwise MCP Server. It is designed to verify that the server can properly discover hubs, connect to gateways, and retrieve device states **without making any state-changing operations**.

## Purpose

This test suite ensures that:
- The MCP server is running and healthy
- All read-only tools function correctly
- Hub discovery and connection works
- Device state retrieval is accurate
- Resources and prompts are accessible

## Safety

This test suite **only tests read-only operations** and will never:
- Change temperature setpoints
- Switch devices on/off
- Modify gateway modes or settings
- Delete notifications
- Reboot the gateway

## Tested Operations

### Core Server Tests (Required)
1. **Health Check** - Verify server is running
2. **Initialize MCP Connection** - Establish MCP protocol connection
3. **List Available Tools** - Enumerate all tools
4. **List Available Resources** - Enumerate all resources
5. **List Available Prompts** - Enumerate all prompts
6. **Get Setup Guide Prompt** - Retrieve setup instructions

### Network Discovery Tests (Optional)
7. **Scan Network for Hubs** - Discover Plugwise hubs using .env passwords

### Gateway Tests (Optional - requires hub)
8. **Connect to Gateway** - Connect and retrieve gateway information

### Device Tests (Optional - requires connection)
9. **Get All Devices** - Retrieve all devices and their current states
10. **Read Devices Resource** - Access devices via resource URI

## Usage

### Quick Start

```bash
# Run the test suite
npm run test:all
```

### Direct Execution

```bash
# Using tsx
tsx scripts/test-all.ts

# Using ts-node
ts-node scripts/test-all.ts
```

### Prerequisites

1. **Server must be running:**
   ```bash
   npm run dev
   # or
   npm start
   ```

2. **Configure environment variables** (optional but recommended):

   Create a `.env` file:
   ```bash
   # Hub passwords for network scanning
   HUB1=glmpttxf
   HUB2=anotherpw
   
   # Or specify a specific gateway to test
   PLUGWISE_HOST=192.168.1.100
   PLUGWISE_PASSWORD=glmpttxf
   
   # Server URL (optional)
   MCP_SERVER_URL=http://localhost:3000/mcp
   ```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MCP_SERVER_URL` | MCP server endpoint | No | `http://localhost:3000/mcp` |
| `PLUGWISE_HOST` | Specific gateway IP to test | No | Auto-discovered |
| `PLUGWISE_PASSWORD` | Gateway password | No | Uses HUB1/HUB2 |
| `HUB1`, `HUB2`, etc. | Hub passwords for scanning | No | - |

## Output

The test suite provides detailed output for each test:

```
🚀 Plugwise MCP Server - Comprehensive Read-Only Test Suite
📡 Server URL: http://localhost:3000/mcp
💚 Health URL: http://localhost:3000/health

Testing all read-only MCP tools...

======================================================================
🧪 Test: Health Check
======================================================================

📤 Request [...]
📥 Response [...]

✅ PASSED (45ms)

[... more tests ...]

======================================================================
📊 TEST SUMMARY
======================================================================

Total Tests: 10
✅ Passed: 8
❌ Failed: 2
⏱️  Total Duration: 2547ms

Detailed Results:

1. ✅ Health Check [PASS] (45ms)
   Server: plugwise-mcp-server v1.0.0, Connected: true

2. ✅ Initialize MCP Connection [PASS] (23ms)
   Connected to plugwise-mcp-server v1.0.0

[... more results ...]

🎉 All tests passed!

💡 Note: This test suite only tests READ-ONLY operations.
   State-changing tools are intentionally excluded to prevent
   accidental modifications to your Plugwise system.
```

## Test Results

Each test reports:
- ✅ **PASSED** - Test completed successfully
- ❌ **FAILED** - Test encountered an error
- ⚠️ **SKIPPED** - Optional test skipped (e.g., no hub available)

### Exit Codes

- `0` - All critical tests passed (core server tests)
- `1` - One or more critical tests failed

Optional tests (network scan, gateway connection, device retrieval) do not cause the test suite to fail if they are skipped.

## Device Information

When devices are found, the test suite displays detailed information:

```
Found 5 devices/zones:

  📍 Living Room (thermostat)
     ID: abc123
     🌡️  Temperature: 21.5°C
     🎯 Setpoint: 20.0°C
     📊 Difference: 1.5°C

  📍 Bedroom Switch (relay)
     ID: def456
     🔌 State: ON

Device Summary:
  Thermostats/Zones: 3
  Switches/Relays: 2
  Sensors: 0
  Other: 0
```

## Excluded State-Changing Tools

The following tools are **intentionally NOT tested** to prevent accidental system changes:

- `set_temperature` - Changes temperature setpoints
- `set_preset` - Changes thermostat preset modes
- `control_switch` - Turns switches on/off
- `set_gateway_mode` - Changes gateway mode (home/away/vacation)
- `set_dhw_mode` - Changes domestic hot water mode
- `set_regulation_mode` - Changes heating regulation mode
- `delete_notification` - Deletes gateway notifications
- `reboot_gateway` - Reboots the gateway

## Troubleshooting

### "Server is not responding"
Ensure the MCP server is running:
```bash
npm run dev
```

### "No hubs found during scan"
- Check that HUB1, HUB2, etc. are defined in `.env`
- Verify hubs are on the same network
- Try specifying the network manually in code

### "Connection failed"
- Verify `PLUGWISE_HOST` and `PLUGWISE_PASSWORD` are correct
- Check that the gateway is reachable on the network
- Ensure no firewall is blocking port 80

### "Not connected to gateway"
Device tests are skipped if gateway connection fails. This is normal behavior if no hub is available.

## Integration with CI/CD

The test suite is designed to work in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Start MCP Server
  run: npm start &
  
- name: Wait for server
  run: sleep 5
  
- name: Run tests
  run: npm run test:all
  env:
    PLUGWISE_HOST: ${{ secrets.PLUGWISE_HOST }}
    PLUGWISE_PASSWORD: ${{ secrets.PLUGWISE_PASSWORD }}
```

## Development

To add new read-only tests:

1. Create a new test function following the pattern:
   ```typescript
   async function testNewFeature(): Promise<string> {
       const result = await sendRequest('tools/call', {
           name: 'your_tool',
           arguments: {}
       });
       
       // Validate result
       // Return summary string
       return 'Summary of what was tested';
   }
   ```

2. Add the test to the main execution:
   ```typescript
   await runTest('Test Name', testNewFeature, optional);
   ```

3. Rebuild and test:
   ```bash
   npm run build
   npm run test:all
   ```

## Related Scripts

- `test-mcp-server.js` - Original MCP server test script
- `test-autoload.js` - Tests hub autoloading from .env
- `test-network-scan.js` - Tests network scanning functionality
- `workflow-demo.js` - Demonstrates common workflows

## See Also

- [Quick Reference](../docs/quick-reference.md)
- [Setup Guide](../docs/setup.md)
- [Network Scanning](../docs/network-scanning.md)
