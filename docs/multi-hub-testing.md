# Multi-Hub Testing Support

## Overview
The test scripts have been updated to support testing multiple Plugwise hubs simultaneously. This allows you to test all your configured hubs in a single run.

## Configuration

### .env File Format
Configure your hubs in the `.env` file using this pattern:

```env
HUB1=<hub_id>
HUB1IP=<ip_address>
HUB2=<hub_id>
HUB2IP=<ip_address>
HUB3=<hub_id>
HUB3IP=<ip_address>
```

**Example:**
```env
HUB1=glmpttxf
HUB1IP=192.168.178.235
HUB2=dkcqbjkz
HUB2IP=192.168.178.218
```

### Important Notes
- Hub numbers must be sequential (HUB1, HUB2, HUB3, etc.)
- The Hub ID serves as the password for authentication
- IP addresses should be accessible from your network

## Updated Test Scripts

### test-temperature-tools.ts
This script now:
- Automatically detects all configured hubs from `.env`
- Tests each hub sequentially
- Provides individual results for each hub
- Shows a final summary with success/failure counts

### Running the Test

```bash
npx tsx scripts/test-temperature-tools.ts
```

### Output Format

The script will:
1. List all detected hubs
2. Test each hub individually with full details
3. Continue testing remaining hubs even if one fails
4. Provide a final summary

**Example output:**
```
🌡️  Temperature Tools Test - All Hubs

📡 Found 2 hub(s) configured in .env:
   • HUB1: 192.168.178.235
   • HUB2: 192.168.178.218

══════════════════════════════════════════════════════════════════════
🏠 Testing HUB1: 192.168.178.235
══════════════════════════════════════════════════════════════════════
[... detailed test output for HUB1 ...]

══════════════════════════════════════════════════════════════════════
🏠 Testing HUB2: 192.168.178.218
══════════════════════════════════════════════════════════════════════
[... detailed test output for HUB2 ...]

📊 Final Summary
   ✅ Successful: 2/2
   ❌ Failed: 0/2

🎉 All hubs tested successfully!
```

## Test Results Per Hub

For each hub, the script reports:
- ✅ Gateway connection and version info
- 📊 Device count
- 🌡️ Temperature sensor devices found
- 📍 Individual device readings (current temp, setpoint, state, mode)
- 📊 Temperature statistics (average, min, max)
- 🔥 Heating/cooling/idle device counts

## Error Handling

- If no hubs are found in `.env`, the script exits with an error
- If a hub test fails, the script continues to test remaining hubs
- Final summary shows success/failure count
- Script exits with error code if any hub failed

## Implementation Details

### parseHubs() Function
```typescript
function parseHubs(): Array<{ name: string, host: string, password: string }> {
    const hubs: Array<{ name: string, host: string, password: string }> = [];
    let hubNum = 1;
    
    while (true) {
        const hubId = process.env[`HUB${hubNum}`];
        const hubIp = process.env[`HUB${hubNum}IP`];
        
        if (!hubId || !hubIp) {
            break;
        }
        
        hubs.push({
            name: `HUB${hubNum}`,
            host: hubIp,
            password: hubId
        });
        
        hubNum++;
    }
    
    return hubs;
}
```

### testHub() Function
Each hub test is isolated in its own function, allowing independent success/failure without affecting other hubs.

## Future Enhancements

Potential improvements:
- Parallel hub testing for faster execution
- Configuration file support for hub-specific settings
- Export results to JSON/CSV format
- Hub comparison reports
- Schedule periodic testing
