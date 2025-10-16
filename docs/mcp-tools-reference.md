# Plugwise MCP Server - Tools Reference

## Overview

This is an MCP (Model Context Protocol) server that provides tools for interacting with Plugwise smart home devices. MCP clients (like Claude Desktop, chatbots, or other AI applications) can call these tools to control and monitor your Plugwise system.

## Important: This is NOT a Chatbot

This server provides **MCP tools**, not slash commands. The tools are invoked by MCP clients using JSON-RPC calls, not by typing commands directly into this server.

## Available Tools

### Hub Discovery & Connection

#### `add_hub`
Add a new Plugwise hub by scanning the network.

**Parameters:**
```json
{
  "hubName": "string (required)" // Hub name/ID used as password
}
```

**Example:**
```json
{
  "name": "add_hub",
  "arguments": {
    "hubName": "glmpuuxg"
  }
}
```

**Response:**
- Success: Hub details with IP, model, firmware
- Error: Validation message or "hub not found"

**Side Effects:**
- Scans local network for the hub
- Saves hub to `/hubs/<hubName>.json`
- Adds hub to in-memory registry

---

#### `scan_network`
Scan the local network for Plugwise hubs using passwords from .env file.

**Parameters:**
```json
{
  "network": "string (optional)" // CIDR notation, e.g., "192.168.1.0/24"
}
```

**Example:**
```json
{
  "name": "scan_network",
  "arguments": {
    "network": "192.168.1.0/24"
  }
}
```

---

#### `connect`
Connect to a Plugwise gateway.

**Parameters:**
```json
{
  "host": "string (required)",    // IP address or hostname
  "password": "string (required)"  // Hub password (smile ID)
}
```

**Example:**
```json
{
  "name": "connect",
  "arguments": {
    "host": "192.168.1.100",
    "password": "glmpuuxg"
  }
}
```

---

### Device Management

#### `get_devices`
Get all devices and their current states from the connected gateway.

**Parameters:** None

**Example:**
```json
{
  "name": "get_devices",
  "arguments": {}
}
```

---

### Climate Control

#### `set_temperature`
Set thermostat target temperature.

**Parameters:**
```json
{
  "device_id": "string (required)",   // Device ID of the thermostat
  "temperature": "number (required)"  // Target temperature in Celsius
}
```

**Example:**
```json
{
  "name": "set_temperature",
  "arguments": {
    "device_id": "abc123",
    "temperature": 21.5
  }
}
```

---

#### `set_preset`
Set thermostat preset mode.

**Parameters:**
```json
{
  "device_id": "string (required)",  // Device ID of the thermostat
  "preset": "string (required)"      // Preset mode (home, away, vacation, etc.)
}
```

---

### Switch Control

#### `control_switch`
Control switches and relays.

**Parameters:**
```json
{
  "device_id": "string (required)",  // Device ID of the switch/relay
  "state": "boolean (required)"      // true = on, false = off
}
```

**Example:**
```json
{
  "name": "control_switch",
  "arguments": {
    "device_id": "switch123",
    "state": true
  }
}
```

---

### Gateway Control

#### `set_gateway_mode`
Set gateway mode.

**Parameters:**
```json
{
  "mode": "string (required)"  // "home", "away", or "vacation"
}
```

---

#### `set_dhw_mode`
Set domestic hot water mode.

**Parameters:**
```json
{
  "mode": "string (required)"  // "auto", "boost", "comfort", or "off"
}
```

---

#### `set_regulation_mode`
Set heating regulation mode.

**Parameters:**
```json
{
  "mode": "string (required)"  // "heating", "off", "bleeding_cold", or "bleeding_hot"
}
```

---

#### `delete_notification`
Clear gateway notifications.

**Parameters:** None (clears all notifications)

---

#### `reboot_gateway`
Reboot the Plugwise gateway.

**Parameters:** None

---

## How to Use

### From an MCP Client

1. Connect your MCP client to this server
2. Call tools using JSON-RPC format
3. Process responses from the server

### Example Client Code (Python)

```python
import mcp

client = mcp.Client()
client.connect("plugwise-mcp-server")

# Add a hub
response = client.call_tool("add_hub", {"hubName": "glmpuuxg"})
print(response)

# Connect to the hub
response = client.call_tool("connect", {
    "host": "192.168.1.100",
    "password": "glmpuuxg"
})

# Get devices
devices = client.call_tool("get_devices", {})
```

## Configuration

Set up your environment in `.env`:

```
HUB1=glmpuuxg
HUB1IP=192.168.1.100

HUB2=anotherhub
HUB2IP=192.168.1.101
```

These will be automatically loaded and available via `scan_network`.

## File Storage

- Hub configurations: `/hubs/<hubName>.json`
- These files are excluded from git via `.gitignore`
- Contains: name, IP, password, model, firmware, discoveredAt

## Testing

Test tools using the provided test scripts:

```bash
# Test add_hub functionality
tsx scripts/test-add-hub.ts glmpuuxg

# Test read-only operations
npm run test:read-only

# Test features
npm run test:features
```
