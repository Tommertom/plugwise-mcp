# Server Description Hub Listing Feature

## Overview

The Plugwise MCP Server now automatically includes a list of all known hubs in its server description. This feature helps AI agents and coding assistants understand which hubs are available without needing to call additional tools.

## Implementation

### Changes Made

#### 1. Modified Constructor
**File**: `/home/tom/plugwise/src/mcp/server.ts`

The `PlugwiseMcpServer` constructor has been enhanced to:
1. Initialize services first (before creating the Server instance)
2. Load known hubs synchronously from the `/hubs` folder
3. Format hub information into a description string
4. Append hub list to the server description

### New Methods

#### `getKnownHubsSync()`
Synchronously loads hub configuration files from the `/hubs` directory.

```typescript
private getKnownHubsSync(): Array<{ name: string; ip: string }>
```

**Returns**: Array of hub objects containing name and IP address

**Behavior**:
- Reads all `.json` files from the `/hubs` directory
- Parses each file to extract hub name and IP address
- Returns empty array if directory doesn't exist or has no files
- Skips invalid JSON files with error logging

#### `formatHubsDescription()`
Formats the hub list into a human-readable string for the server description.

```typescript
private formatHubsDescription(hubs: Array<{ name: string; ip: string }>): string
```

**Parameters**:
- `hubs`: Array of hub objects to format

**Returns**: Formatted string containing:
- Instruction message about using add_hub tool
- List of hubs with their names and IP addresses
- Special message if no hubs are configured

**Example Output** (with hubs):
```
The hubs known now are listed below. If you are missing a hub, ask the user for the name of the hub and then use the add_hub tool to add it.
- Living Room Hub (192.168.1.100)
- Bedroom Hub (192.168.1.101)
```

**Example Output** (no hubs):
```
The hubs known now are listed below. If you are missing a hub, ask the user for the name of the hub and then use the add_hub tool to add it.
- No hubs configured yet
```

## Usage

### For End Users

When the MCP server starts, the description automatically includes all known hubs:

```json
{
  "name": "plugwise-mcp-server",
  "version": "1.0.0",
  "description": "Smart home automation control server... The hubs known now are listed below. If you are missing a hub, ask the user for the name of the hub and then use the add_hub tool to add it.\n- Living Room Hub (192.168.1.100)\n- Bedroom Hub (192.168.1.101)"
}
```

### For AI Agents

AI agents can now:
1. See available hubs immediately when connecting to the server
2. Know which hubs are already configured
3. Understand when to use the `add_hub` tool to add additional hubs

## Testing

A test script has been created to verify this functionality:

**File**: `/home/tom/plugwise/scripts/test-server-description.ts`

Run the test:
```bash
npm run build
node dist/scripts/test-server-description.js
```

The test:
1. Creates mock hub JSON files in the `/hubs` directory
2. Instantiates the server
3. Verifies the description includes hub information
4. Cleans up test files

## Benefits

1. **Immediate Context**: AI agents and coding assistants can see available hubs without additional API calls
2. **User Guidance**: Clear message about using add_hub for adding hubs
3. **Zero Impact**: No performance overhead (synchronous file read during startup)
4. **Graceful Degradation**: Works correctly even with no hubs configured

## Technical Details

### Why Synchronous Loading?

The constructor uses synchronous file operations (`fs.readFileSync`) because:
- Constructors cannot be async in TypeScript
- Server instance needs description at construction time
- Hub files are small (typically < 1KB each)
- Startup-time operation (one-time cost)
- Simpler error handling

### File Structure

Each hub file in `/hubs` is a JSON file:

```json
{
  "name": "Living Room Hub",
  "ip": "192.168.1.100",
  "password": "secret123",
  "model": "Anna",
  "firmware": "4.0.15",
  "discoveredAt": "2025-10-26T12:00:00.000Z"
}
```

The description only uses `name` and `ip` fields for brevity and security.

## Future Enhancements

Potential improvements:
- Include hub model type in description
- Add online/offline status indicator
- Support filtering by hub type
- Cache hub list to avoid repeated file reads
- Add timestamp of last hub scan

## Related Files

- `/home/tom/plugwise/src/mcp/server.ts` - Main implementation
- `/home/tom/plugwise/src/services/hub-discovery.service.ts` - Hub loading service
- `/home/tom/plugwise/scripts/test-server-description.ts` - Test script
- `/home/tom/plugwise/hubs/*.json` - Hub configuration files
