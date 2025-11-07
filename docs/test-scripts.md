# Test Scripts

## MCP Connection Test

### Overview
The `test-mcp-connection.ts` script tests the Plugwise MCP Server by connecting to it via stdio and displaying server information and available tools.

### Location
`scripts/test-mcp-connection.ts`

### Usage

#### Using npm script (recommended):
```bash
npm run test:connection
```

#### Direct execution:
```bash
# Build the project first
npm run build

# Run the compiled test script
node dist/scripts/test-mcp-connection.js
```

### What it does

1. **Spawns the MCP Server**: Creates a child process running the MCP server
2. **Connects via stdio**: Establishes a stdio transport connection to the server
3. **Displays Server Info**: Shows:
   - Server name
   - Version
   - Full description
4. **Lists All Tools**: Displays:
   - Tool names
   - Descriptions
   - Parameters (with required fields highlighted)

### Output Example

The script provides formatted output including:

- Server metadata (name, version, description)
- Complete tool listing with 16 available tools:
  - Hub management (add_hub, list_hubs, connect)
  - Device discovery (get_devices)
  - Temperature control (set_temperature, get_temperature, etc.)
  - Preset management (set_preset)
  - Switch control (control_switch)
  - Gateway configuration (set_gateway_mode, set_dhw_mode, etc.)
  - System operations (reboot_gateway, delete_notification)

### Technical Details

**Technologies:**
- TypeScript
- @modelcontextprotocol/sdk Client & StdioClientTransport
- Node.js child processes

**Transport:**
- Uses stdio (standard input/output) for MCP communication
- Automatically spawns and manages the server process lifecycle

**Cleanup:**
- Properly closes the client connection
- Terminates the server process when complete

---

## Device Discovery Test

### Overview
The `test-device-discovery.ts` script performs comprehensive device discovery testing by connecting to all configured hubs, triggering device scans, and verifying filesystem storage.

### Location
`scripts/test-device-discovery.ts`

### Usage

#### Using npm script (recommended):
```bash
npm run test:devices
```

#### Direct execution:
```bash
# Build the project first
npm run build

# Run the compiled test script
node dist/scripts/test-device-discovery.js
```

### What it does

The script performs 4 main steps:

#### Step 1: List Hubs
- Calls the `list_hubs` tool to get all configured hubs
- Falls back to filesystem loading if tool response isn't parseable
- Displays hub information including:
  - Name
  - IP address
  - Password (filename)
  - Model
  - Firmware version

#### Step 2: Discover Devices
- Connects to each hub using the `connect` tool
- Calls `get_devices` to trigger device discovery
- Collects all discovered devices for each hub

#### Step 3: Display Discovered Devices
- Lists all devices found across all hubs
- Shows for each device:
  - Name
  - Device ID
  - Type/Class
  - Location (if available)
- Provides total device count

#### Step 4: Verify Filesystem Storage
- Checks `mcp_data/plugwise/devices/` directory
- Lists all saved device JSON files
- Groups files by hub
- Cross-checks discovered devices with saved files
- Reports:
  - Number of devices saved per hub
  - Match status (all saved, partial, or none)

### Output Example

```
🚀 Starting Plugwise Device Discovery Test...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STEP 1: LISTING HUBS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 1 hub(s):

1. Plugwise Gateway
   IP: 192.168.178.235
   Password: glmpttxf
   Model: smile_open_therm
   Firmware: 3.7.8

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STEP 2: DISCOVERING DEVICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Discovering devices for hub: Plugwise Gateway (192.168.178.235)...
   Connecting...
   ✅ Connected to Plugwise Gateway
   Fetching devices...
   ✅ Found 17 devices

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STEP 3: DISCOVERED DEVICES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏠 Hub: Plugwise Gateway
   Total devices: 17

   1. Licht boompje
      ID: 22ac469f705c4f4e90b801017694163a
      Type: lamp

   2. Central heating boiler
      ID: e5cad71698f24fd99ca0c734318d4f1a
      Type: heater_central
   
   ...

📊 Total devices discovered across all hubs: 17

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 STEP 4: VERIFYING FILESYSTEM STORAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📁 Checking directory: /home/tom/plugwise/mcp_data/plugwise/devices

Found 17 device file(s):

   📦 Plugwise Gateway: 17 device(s)

🔍 Cross-checking discovered devices with saved files:

   Hub: Plugwise Gateway
   Total devices discovered: 17
   Devices saved to filesystem: 17/17
   ✅ All devices successfully saved

✨ Device discovery test completed successfully!
```

### Technical Details

**Technologies:**
- TypeScript
- @modelcontextprotocol/sdk Client
- Node.js filesystem operations

**Device Storage Format:**
- Individual JSON file per device
- Naming convention: `{HubName}_{DeviceID}.json`
- Location: `mcp_data/plugwise/devices/`

**Data Flow:**
1. MCP client calls `get_devices` tool
2. Tool returns entities as object with device IDs as keys
3. Script converts to array and extracts device information
4. MCP server automatically saves each device to individual file
5. Script verifies files exist and match discovered devices

**Verification Logic:**
- Checks each discovered device ID against expected filename
- Reports match statistics per hub
- Identifies any missing or extra files
