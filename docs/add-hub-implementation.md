# Add Hub Feature - Implementation Summary

## Overview
Successfully implemented the `/addhub` command for the Plugwise MCP Server, allowing users to add new Plugwise hubs by scanning the network with a specific hub name/password.

## Changes Made

### 1. Created New Tool: `add-hub.tool.ts`
- **Location**: `/home/tom/plugwise/src/mcp/tools/add-hub.tool.ts`
- **Purpose**: MCP tool that handles the `/addhub` command
- **Features**:
  - Validates hub name input (required parameter)
  - Shows syntax help if no hub name is provided
  - Calls discovery service to scan network for the hub
  - Returns formatted success/error messages

### 2. Enhanced Hub Discovery Service
- **Location**: `/home/tom/plugwise/src/services/hub-discovery.service.ts`
- **New Methods**:
  - `addHubByName(hubName: string)`: Main method to add a hub by scanning the network
  - `saveHubToFile(hubName: string, hub: DiscoveredHub)`: Saves hub data to JSON file
  - `loadHubFromFile(hubName: string)`: Loads hub data from JSON file
  - `loadAllHubsFromFiles()`: Loads all hubs from the `/hubs` folder
  - `scanForSpecificHub(network: string, hubName: string)`: Scans network for a specific hub
  
- **New Properties**:
  - `hubsDirectory`: Path to the `/hubs` folder for storing hub files

### 3. Updated MCP Server
- **Location**: `/home/tom/plugwise/src/mcp/server.ts`
- **Changes**:
  - Added `add_hub` tool to the tool list
  - Implemented `handleAddHub()` method
  - Added tool to the switch statement in `handleToolCall()`
  - Updated console output to include the new tool

### 4. Registered Tool in Index
- **Location**: `/home/tom/plugwise/src/mcp/tools/index.ts`
- **Changes**:
  - Imported `registerAddHubTool`
  - Called `registerAddHubTool` in `registerAllTools()`

### 5. Created Hub Storage Directory
- **Location**: `/home/tom/plugwise/hubs/`
- **Purpose**: Persistent storage for discovered hub configurations
- **File Format**: `<hub-name>.json`

### 6. Documentation
- **Added**: `/home/tom/plugwise/docs/add-hub-guide.md`
  - Complete usage guide
  - Examples and syntax
  - Error handling documentation
  - Security considerations

### 7. Test Script
- **Added**: `/home/tom/plugwise/scripts/test-add-hub.ts`
  - Tests adding a hub by name
  - Verifies file creation
  - Tests loading hubs from files
  - Updated `/home/tom/plugwise/scripts/README.md`

## How It Works

1. **User invokes command**: `/addhub glmpuuxg`
2. **Validation**: System checks if hub name is provided
3. **Check existing file**: Looks for existing hub file in `/hubs` folder
4. **Network scan**: Scans local network (auto-detected or specified) for the hub
5. **Connection test**: Tests each IP with the provided hub name as password
6. **Save to file**: Once found, saves hub info to `/hubs/<hub-name>.json`
7. **In-memory storage**: Also stores in discovery service for immediate use

## File Structure

### Hub JSON File Format
```json
{
  "name": "Adam",
  "ip": "192.168.1.100",
  "password": "glmpuuxg",
  "model": "Gateway",
  "firmware": "3.7.8",
  "discoveredAt": "2025-10-16T10:30:00.000Z"
}
```

## Usage Examples

### Valid Usage
```
/addhub glmpuuxg
```

**Response:**
```
✅ Hub found and added successfully!

Hub Details:
  Name: Adam
  IP: 192.168.1.100
  Model: Gateway
  Firmware: 3.7.8

The hub has been saved to: /hubs/glmpuuxg.json
```

### Invalid Usage (No Hub Name)
```
/addhub
```

**Response:**
```
❌ Hub name is required.

Syntax: /addhub <hub-name>

Example: /addhub glmpuuxg

The hub name is the unique identifier/password for your Plugwise hub.
```

### Hub Not Found
```
/addhub invalidhub
```

**Response:**
```
❌ Hub "invalidhub" not found on network 192.168.1.0/24. 
Please ensure the hub is connected and the name is correct.
```

## Security Considerations

- Hub passwords are stored in plain text in JSON files
- The `/hubs` folder is already in `.gitignore` to prevent accidental commits
- Users should ensure proper file permissions on the `/hubs` folder
- Recommended to keep hub files private and not share publicly

## Testing

Run the test script:
```bash
tsx scripts/test-add-hub.ts glmpuuxg
```

Or test within the MCP server by using the `/addhub` command.

## Build Status

✅ Project builds successfully with TypeScript compilation
✅ No compilation errors
✅ All imports resolved correctly
✅ Type safety maintained throughout

## Future Enhancements

Potential improvements:
1. Add encryption for stored passwords
2. Support for custom network ranges
3. Bulk import from CSV
4. Hub management commands (list, remove, update)
5. Export/import hub configurations
