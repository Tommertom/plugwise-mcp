# Test Scripts Summary

This directory contains comprehensive read-only test scripts for the Plugwise MCP Server, following the same pattern as the [Sonos TypeScript MCP project](https://github.com/Tommertom/sonos-ts-mcp).

## Quick Reference

### Available Test Scripts

| Script | Command | Purpose | Duration |
|--------|---------|---------|----------|
| Read-Only Tests | `npm run test:read-only` | Comprehensive device & sensor testing | ~30s |
| Feature Tests | `npm run test:features` | Protocol & tool validation | ~20s |
| Add Hub Test | `tsx scripts/test-add-hub.ts <hub-name>` | Test adding a hub by name | ~60s |
| List Hubs Test | `tsx scripts/test-list-hubs.ts` | Test listing registered hubs | <1s |
| Legacy Tests | `npm run test:all` | HTTP-based testing (alternative) | ~60s |

### Quick Start

```bash
# Test without hardware (recommended first run)
npm run test:read-only -- --mock
npm run test:features -- --mock

# Test with real hardware
PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=yourpass npm run test:read-only
```

## What's Tested

### Read Operations ✅
- Network scanning and hub discovery
- Gateway connection and information
- Device enumeration and classification
- Sensor data (temperature, humidity, valve position, etc.)
- Thermostat states and presets
- Switch states and availability
- Data consistency across multiple reads

### NOT Tested (By Design) ❌
- Temperature setpoint changes
- Preset modifications
- Switch toggling
- Gateway mode changes
- Device reboots
- Any state-changing operations

## Test Scripts Details

### 1. test-read-only.ts
Main read-only test suite for end-to-end validation.

**Tests:**
- Network scanning
- Gateway connection
- Device discovery
- Sensor reading
- Thermostat reading
- Switch reading
- Device availability

**Output Example:**
```
╔══════════════════════════════════════════╗
║  Plugwise Read-Only Test Suite          ║
║  Network, Devices, Sensors, States       ║
╚══════════════════════════════════════════╝

✅ Scan Network for Hubs
   Found 1 hub(s)

✅ Connect to Gateway
   Gateway: Adam
   Type: thermostat

✅ Get All Devices
   Total entities: 15
```

### 2. test-features.ts
Detailed protocol and feature validation.

**Tests:**
- MCP protocol compliance
- Tool schema validation
- Data structure verification
- Error handling
- Performance metrics
- Data consistency

**Output Example:**
```
╔══════════════════════════════════════════╗
║  Plugwise Feature Test Suite            ║
║  Detailed Tool & Protocol Testing       ║
╚══════════════════════════════════════════╝

✅ List Available Tools
   Found 11 tools

✅ Validate Tool Schemas
   All 3 required tools present
```

### 3. test-utils.ts
Shared utilities for MCP server testing.

**Exports:**
- `initializeMcpConnection()` - MCP protocol handshake
- `listTools()` - Get available MCP tools
- `callTool()` - Execute MCP tool
- `discoverHubs()` - Discover Plugwise hubs
- `runTest()` - Test runner with error handling
- `formatTestResult()` - Pretty-print test results
- `wait()` - Promise-based delays

## Mock Mode

All test scripts support mock mode for testing without hardware:

```bash
npm run test:read-only -- --mock
npm run test:features -- --mock
```

**Mock Data Includes:**
- Sample gateway configurations
- Multiple device types (zones, valves, relays)
- Realistic sensor values
- Complete entity structures

**Benefits:**
- No hardware required
- Consistent test results
- Fast execution
- CI/CD integration
- Development without gateway access

## Real Hardware Testing

### Prerequisites
1. Plugwise gateway (Adam, Anna, Smile P1, Stretch)
2. Gateway connected to network
3. Computer on same network
4. Gateway password (Smile ID)

### Configuration

**Option 1: Environment Variables**
```bash
PLUGWISE_HOST=192.168.1.100 PLUGWISE_PASSWORD=abc123 npm run test:read-only
```

**Option 2: .env File**
```bash
# .env
PLUGWISE_HOST=192.168.1.100
PLUGWISE_PASSWORD=abc123
```

Then run:
```bash
npm run test:read-only
```

### Expected Results

**Successful Run:**
- All tests pass (✅)
- No errors in output
- Device data displayed correctly
- Statistics calculated properly

**Common Issues:**
- Connection timeout → Check IP and password
- No devices found → Use mock mode or verify network
- Authentication error → Verify password is correct

## Architecture

### Test Flow
```
1. Start MCP Server (stdio mode)
   ↓
2. Initialize MCP Connection
   ↓
3. Discover/Configure Gateway
   ↓
4. Run Test Suite
   ↓
5. Collect Results
   ↓
6. Cleanup & Shutdown
```

### Communication Pattern
```
Test Script ←→ MCP Server ←→ Plugwise Gateway
   (stdio)      (JSON-RPC)    (HTTP XML)
```

## Files

```
scripts/
├── test-read-only.ts     # Main read-only test suite
├── test-features.ts      # Feature & protocol tests
├── test-utils.ts         # Shared utilities
├── test-all.ts           # Legacy HTTP tests
├── debug-*.ts            # Debug utilities
└── workflow-demo.js      # Interactive demo
```

## Documentation

- **[Quick Test Guide](../docs/quick-test-guide.md)** - Fast start guide
- **[Test Scripts Documentation](../docs/test-scripts.md)** - Comprehensive docs
- **[Test All Script](../docs/test-all-script.md)** - Legacy testing
- **[Multi-Hub Testing](../docs/multi-hub-testing.md)** - Multiple gateways

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - run: npm run test:read-only -- --mock
      - run: npm run test:features -- --mock
```

## Development

### Adding New Tests

1. Import test utilities:
```typescript
import { runTest, callTool, wait } from './test-utils.js';
```

2. Create test function:
```typescript
async function testNewFeature(): Promise<void> {
    await runTest('My New Test', async () => {
        const result = await callTool(mcpProcess, {
            name: 'some_tool',
            arguments: { param: 'value' }
        });
        
        if (!result.success) {
            throw new Error('Test failed');
        }
    });
}
```

3. Add to test suite:
```typescript
await testNewFeature();
```

### Best Practices

✅ **DO:**
- Test read operations only
- Use descriptive test names
- Provide helpful error messages
- Support mock mode
- Handle errors gracefully
- Clean up resources

❌ **DON'T:**
- Change device states
- Hardcode credentials
- Skip error handling
- Leave servers running
- Assume network access

## Troubleshooting

### Tests Won't Start
```bash
# Rebuild the project
npm run build

# Check node version
node --version  # Should be 18+
```

### Mock Mode Issues
```bash
# Verify mock flag
npm run test:read-only -- --mock

# Or use environment
MOCK_DEVICES=true npm run test:read-only
```

### Connection Problems
```bash
# Test gateway manually
curl http://192.168.1.100/core/domain_objects -u smile:yourpass

# Verify network
ping 192.168.1.100
```

## Performance

**Typical Execution Times:**
- Mock mode: 1-2 seconds
- Real hardware (local): 5-10 seconds
- Real hardware (remote): 15-30 seconds

**Optimization Tips:**
- Use mock mode for development
- Cache gateway connections
- Reduce timeout values
- Run tests in parallel (when safe)

## Credits

Test architecture inspired by:
- [sonos-ts-mcp](https://github.com/Tommertom/sonos-ts-mcp) test suite
- [python-plugwise](https://github.com/plugwise/python-plugwise) testing approach
- MCP SDK testing patterns

## License

MIT - See LICENSE file for details
