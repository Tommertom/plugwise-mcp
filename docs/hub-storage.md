# Hub Storage

## Overview

The Plugwise MCP server stores hub configuration data in JSON files to persist hub information between server restarts.

## Storage Location

Hub configurations are stored in the `mcp_data/plugwise/hubs` directory relative to the current working directory.

```
mcp_data/
└── plugwise/
    └── hubs/
        ├── hub1.json
        ├── hub2.json
        └── ...
```

## Directory Creation

The server automatically creates the `mcp_data/plugwise/hubs` directory when it starts up if it doesn't already exist. This ensures that:

- No manual setup is required
- The directory structure is consistent across installations
- Hub data is organized in a dedicated MCP data folder

## Hub File Format

Each hub is stored as a JSON file named `{hubName}.json` with the following structure:

```json
{
  "name": "MyHub",
  "ip": "192.168.1.100",
  "password": "hub-password",
  "model": "Adam",
  "firmware": "3.7.7",
  "discoveredAt": "2025-11-05T21:00:00.000Z"
}
```

## Automatic Loading

When the server starts:

1. It checks for the `mcp_data/plugwise/hubs` directory
2. Creates the directory if it doesn't exist (using `recursive: true`)
3. Loads all `.json` files from the directory
4. Populates the hub registry with the stored configurations

## Security Considerations

The hub JSON files contain passwords in plain text. Ensure the `mcp_data` directory has appropriate file permissions to prevent unauthorized access.

## Migration from Previous Versions

If you were using an older version that stored hubs in the `hubs` folder, you can migrate your hub configurations by:

1. Copying all `.json` files from `hubs/` to `mcp_data/plugwise/hubs/`
2. Restarting the server

Or simply re-add your hubs using the `add_hub` tool, which will scan the network and save them to the new location.
