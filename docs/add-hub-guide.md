# Adding Plugwise Hubs

## Overview

The `/addhub` command allows you to add new Plugwise hubs to your system by scanning the network and storing the hub information in JSON files.

## Usage

### Command Syntax

```
/addhub <hub-name>
```

### Parameters

- `hub-name` (required): The unique identifier/password for your Plugwise hub (e.g., `glmpuuxg`)

### Example

```
/addhub glmpuuxg
```

## How It Works

1. **Network Scanning**: When you run `/addhub` with a hub name, the system scans your local network to find the Plugwise hub using that name as the password.

2. **Hub Discovery**: The system tests each IP address on your network (typically 192.168.1.0/24) to find the hub that responds to the provided password.

3. **Persistent Storage**: Once found, the hub information is saved to a JSON file in the `/hubs` folder:
   - Filename: `<hub-name>.json`
   - Contains: hub name, IP address, password, model, firmware version, and discovery timestamp

4. **Automatic Loading**: On subsequent server starts, previously discovered hubs are automatically loaded from the `/hubs` folder.

## Hub File Format

Each hub is stored in a JSON file with the following structure:

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

## Error Handling

### Missing Hub Name

If you run `/addhub` without providing a hub name, you'll see:

```
❌ Hub name is required.

Syntax: /addhub <hub-name>

Example: /addhub glmpuuxg

The hub name is the unique identifier/password for your Plugwise hub.
```

### Hub Not Found

If the hub cannot be found on the network:

```
❌ Hub "glmpuuxg" not found on network 192.168.1.0/24. 
Please ensure the hub is connected and the name is correct.
```

## Hub Storage Location

All discovered hubs are stored in:
```
/hubs/<hub-name>.json
```

This allows you to:
- Keep a persistent record of your hubs
- Quickly reconnect to previously discovered hubs
- Share hub configurations across different environments

## Related Commands

- `/hubs` - List all registered hubs
- `/scan_network` - Scan for all hubs using passwords from the .env file
- `/connect` - Connect to a specific hub using IP and password

## Security Note

The hub password is stored in plain text in the JSON files. Ensure the `/hubs` folder has appropriate file permissions and is not committed to public repositories if the passwords should remain private. Consider adding `/hubs/*.json` to your `.gitignore` file.
