# Hub Storage Path Migration

## Summary

Successfully migrated the Plugwise MCP server to use `mcp_data/plugwise/hubs` instead of `hubs` for storing hub JSON configuration files.

## Changes Made

### 1. Source Code Updates

#### `src/services/hub-discovery.service.ts`
- Updated constructor to use `path.join(process.cwd(), 'mcp_data', 'plugwise', 'hubs')`
- Updated documentation comments for `saveHubToFile()`, `loadHubFromFile()`, and `loadAllHubsFromFiles()` methods
- The `ensureHubsDirectory()` method automatically creates the directory with `recursive: true`

#### `src/mcp/server.ts`
- Updated `getKnownHubsSync()` method to use `path.join(process.cwd(), 'mcp_data', 'plugwise', 'hubs')`
- Added directory creation with `fs.mkdirSync(hubsDirectory, { recursive: true })` if directory doesn't exist

### 2. Configuration Updates

#### `.gitignore`
- Added `mcp_data/` to exclude the runtime data directory from version control
- Keeps the existing `/hubs/*.json` exclusion for backward compatibility

### 3. Documentation

#### `docs/hub-storage.md` (NEW)
- Comprehensive documentation about the hub storage system
- Explains directory structure, file format, and automatic loading
- Includes security considerations and migration guide

### 4. Testing

#### `scripts/test-hub-storage.ts` (NEW)
- Test script to verify directory creation
- Tests file write/read operations
- Validates directory structure
- All tests passed successfully ✅

## Directory Structure

```
mcp_data/
└── plugwise/
    └── hubs/
        ├── {hubName1}.json
        ├── {hubName2}.json
        └── ...
```

## Automatic Creation

The server now automatically creates the `mcp_data/plugwise/hubs` directory when it starts:

1. **HubDiscoveryService constructor**: Creates directory via `ensureHubsDirectory()` async method
2. **PlugwiseMcpServer.getKnownHubsSync()**: Creates directory synchronously if it doesn't exist

Both use `{ recursive: true }` to ensure the entire path is created.

## Build Verification

- ✅ TypeScript compilation successful
- ✅ Compiled JavaScript contains correct paths
- ✅ Test script execution successful
- ✅ Directory creation verified

## Migration Notes

Users migrating from previous versions can:
1. Copy hub JSON files from `hubs/` to `mcp_data/plugwise/hubs/`, or
2. Re-add hubs using the `add_hub` tool (recommended)

## Security

Hub JSON files contain passwords in plain text. The `mcp_data/` directory should have appropriate file permissions to prevent unauthorized access.
