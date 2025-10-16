# List Hubs Command

## Overview

The `/hubs` command lists all registered Plugwise hubs from the `/hubs` folder and the in-memory registry.

## Usage

### Command Syntax

```
/hubs
```

No parameters required.

### Example

```
/hubs
```

## Response Examples

### When Hubs Are Registered

```
📋 Registered Hubs (2)

  1. Adam
     IP: 192.168.1.100
     Model: Gateway
     Firmware: 3.7.8

  2. Smile P1
     IP: 192.168.1.101
     Model: P1 Meter
     Firmware: 4.2.1

Use /connect with the IP address to connect to a hub.
```

### When No Hubs Are Registered

```
📋 No hubs registered yet.

Use /addhub <hub-name> to add a new hub.
```

## How It Works

1. **Load from Files**: The command automatically loads all hub configurations from the `/hubs` folder
2. **In-Memory Registry**: Also includes any hubs discovered during the current session
3. **Formatted List**: Displays each hub with:
   - Hub name
   - IP address
   - Model (if available)
   - Firmware version (if available)

## Use Cases

- **Quick Reference**: See all available hubs at a glance
- **Connection Info**: Get IP addresses for connecting to hubs
- **Verification**: Confirm a hub was successfully added with `/addhub`
- **Inventory**: Maintain an overview of all Plugwise hubs in your network

## Related Commands

- `/addhub <hub-name>` - Add a new hub to the registry
- `/scan_network` - Scan for hubs using .env file passwords
- `/connect` - Connect to a specific hub

## Technical Details

- Reads all `.json` files from the `/hubs` directory
- Merges with in-memory discovered hubs
- Sorted by discovery order
- Shows up to 254 hubs (network limitation)

## Example Workflow

```bash
# Add a hub
/addhub glmpuuxg

# List all hubs
/hubs

# Connect to a hub from the list
/connect 192.168.1.100 glmpuuxg
```
