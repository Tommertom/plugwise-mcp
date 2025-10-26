/**
 * Plugwise MCP Server
 * 
 * Main entry point for the Plugwise MCP server.
 * This MCP server provides tools and resources for interacting with Plugwise
 * smart home devices (Adam, Anna, Smile P1, Stretch) via their HTTP XML API.
 * 
 * Based on: https://github.com/plugwise/python-plugwise
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    type CallToolRequest,
    type ListToolsRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { getServerConfig } from '../config/environment.js';
import { HubDiscoveryService } from '../services/hub-discovery.service.js';
import { ConnectionService } from '../services/connection.service.js';
import * as fs from 'fs';
import * as path from 'path';

export class PlugwiseMcpServer {
    private server: Server;
    private discoveryService: HubDiscoveryService;
    private connectionService: ConnectionService;

    constructor() {
        // Initialize services first
        this.discoveryService = new HubDiscoveryService();
        this.connectionService = new ConnectionService();

        // Load hubs synchronously to include in description
        const hubs = this.getKnownHubsSync();
        const hubsDescription = this.formatHubsDescription(hubs);

        this.server = new Server(
            {
                name: 'plugwise-mcp-server',
                version: '1.0.0',
                description: `Smart home automation control server for Plugwise devices. Specifically designed for coding agents and AI-driven home automation workflows. Provides comprehensive tools for discovering, connecting to, and controlling Plugwise climate control systems (Adam, Anna thermostats), power monitoring (Smile P1), and smart switches (Stretch). Enables coding agents to build intelligent heating schedules, energy monitoring dashboards, automation routines, and integration with other smart home platforms. Supports network discovery, persistent hub management, real-time device state monitoring, and programmatic control of temperature, presets, and appliances.
                
                Always requires the hub name or IP to run tools, so research these with the list_hubs tool. When the user refers to a location, room or device, try the device tool first for all the hubs to find the right hub id and device id. Put this in your plan. ${hubsDescription}`,
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {},
                },
            }
        );

        console.error('Plugwise MCP Server initialized - Smart Home Automation Control for AI Agents');
        console.error('Supports: Climate control, energy monitoring, switch automation, gateway management');
        console.error('Optimized for: Home automation workflows, energy optimization, comfort control');

        this.setupHandlers();
    }

    private getKnownHubsSync(): Array<{ name: string; ip: string }> {
        try {
            const hubsDirectory = path.join(process.cwd(), 'hubs');

            // Check if directory exists
            if (!fs.existsSync(hubsDirectory)) {
                return [];
            }

            const files = fs.readdirSync(hubsDirectory);
            const hubs: Array<{ name: string; ip: string }> = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(hubsDirectory, file);
                        const content = fs.readFileSync(filePath, 'utf-8');
                        const hubData = JSON.parse(content);
                        hubs.push({
                            name: hubData.name || file.replace('.json', ''),
                            ip: hubData.ip || 'unknown'
                        });
                    } catch (error) {
                        // Skip invalid files
                        console.error(`Failed to load hub from ${file}:`, error);
                    }
                }
            }

            return hubs;
        } catch (error) {
            console.error('Error loading hubs:', error);
            return [];
        }
    }

    private formatHubsDescription(hubs: Array<{ name: string; ip: string }>): string {
        if (hubs.length === 0) {
            return '\n\nNo hubs configured yet. Ask the user to provide the name of the hub and then use the add_hub tool to add and scan it.\n- ';
        }

        const hubList = hubs.map(hub => `- ${hub.name} (${hub.ip})`).join('\n');
        return `\n\nThe hubs known now are listed below. If you are missing a hub, ask the user for the name of the hub and then use the add_hub tool to add it.\n${hubList}`;
    } private setupHandlers(): void {
        // Set up tool list handler
        this.server.setRequestHandler(ListToolsRequestSchema, async (_request: ListToolsRequest) => ({
            tools: [
                {
                    name: 'add_hub',
                    description: `Add a new Plugwise hub by name/ID and persist it to storage. Perfect for coding agents building hub management and configuration systems.

CODING AGENT BENEFITS:
- Build user-friendly hub registration interfaces for home automation apps
- Create automated provisioning systems for new installations
- Develop hub inventory management tools
- Generate configuration files and deployment scripts
- Build multi-tenant home automation platforms with hub assignment
- Create backup and restore utilities for hub configurations

HOW IT WORKS:
- Takes the hub name/ID (8-character alphanumeric identifier like "glmpuuxg")
- The hub name IS the password for authentication (security by obscurity pattern)
- Scans the network to locate the hub by testing authentication
- Retrieves hub details: model type, firmware version, capabilities
- Saves hub configuration to /hubs folder as persistent JSON file
- Adds hub to in-memory registry for quick access

HUB NAME FORMAT:
- 8 alphanumeric characters (lowercase)
- Example: "glmpuuxg", "a1b2c3d4", "smile001"
- This ID is printed on the physical hub device
- Same ID is used as the password for HTTP Basic Auth

BEST PRACTICES FOR AI AGENTS:
- User Input: Prompt users to enter the hub ID from the device label
- Validation: Verify hub name format before scanning (8 chars, alphanumeric)
- Network Ready: Ensure network connectivity before attempting to add hub
- Duplicate Check: Use list_hubs first to avoid re-adding existing hubs
- Error Handling: Provide clear guidance if hub is not found on network
- Post-Add Workflow: After successful add, use connect tool to establish connection

OUTPUT:
Returns success status and hub details: name, IP address, model, firmware version`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            hubName: {
                                type: 'string',
                                description: 'The hub name/ID (e.g., glmpuuxg) - an 8-character alphanumeric identifier printed on the physical Plugwise hub. This same value is used as the authentication password.'
                            }
                        },
                        required: ['hubName']
                    }
                },
                {
                    name: 'list_hubs',
                    description: `List all registered Plugwise hubs from persistent storage and in-memory registry. Essential for coding agents building hub selection and management interfaces.

CODING AGENT BENEFITS:
- Build hub selector dropdowns in user interfaces
- Create hub management dashboards showing all registered devices
- Generate system status reports and inventory lists
- Develop multi-hub automation workflows
- Build hub health monitoring and diagnostic tools
- Create configuration backup and documentation systems

WHAT IT RETURNS:
- Complete list of registered hubs with detailed information
- Hub name/ID (unique identifier)
- Current IP address on the network
- Model type (Adam/Anna/Smile P1/Stretch)
- Firmware version information
- Discovery/registration timestamp

DATA SOURCES:
- Loads from /hubs folder (persistent JSON files)
- Includes in-memory registry (recently discovered/added hubs)
- Combines both sources for complete view

BEST PRACTICES FOR AI AGENTS:
- Selection UI: Present hub list for user to choose which hub to connect to
- Status Display: Show hub count and basic info in dashboard views
- Pre-Connection: Always list hubs before attempting connection
- Empty State: Handle zero hubs gracefully with setup guidance
- Refresh Strategy: Re-list after add_hub operations
- Multi-Hub Logic: Use hub list to build zone-based or room-based control systems

COMMON WORKFLOWS:
1. Setup: add_hub → list_hubs → connect (select from list)
2. Management: list_hubs → show details → allow user actions
3. Diagnostics: list_hubs → ping each → report status`,
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'connect',
                    description: `Establish active connection to a Plugwise gateway/hub. Required before any device control operations. Critical for coding agents building real-time home automation control systems.

CODING AGENT BENEFITS:
- Build authenticated API clients for Plugwise device control
- Create session management for multi-user home automation apps
- Develop connection pooling for high-performance automation systems
- Generate connection status monitoring and health checks
- Build automatic reconnection logic for resilient applications
- Create secure credential management workflows

HOW IT WORKS:
- Establishes HTTP Basic Auth connection to Plugwise gateway
- Uses hub's IP address and password (hub name/ID)
- Validates connectivity and authentication
- Retrieves and caches gateway information
- Maintains active session for subsequent device operations
- Returns gateway details: model, firmware, capabilities, zones

CONNECTION REQUIREMENTS:
- Host: IP address of the Plugwise hub (from list_hubs)
- Password: Hub name/ID (8-character identifier)
- Network: Hub must be accessible on local network
- Authentication: HTTP Basic Auth over local HTTP (not HTTPS)

GATEWAY INFORMATION RETURNED:
- Gateway type (Adam/Anna/Smile P1/Stretch)
- Firmware version and capabilities
- Available zones and locations
- Configured devices and appliances
- Supported features (heating, cooling, DHW, etc.)

BEST PRACTICES FOR AI AGENTS:
- Pre-Connection: Use list_hubs to get valid IP addresses
- Credentials: Store hub password securely, never hardcode
- Session Management: Keep connection active for multiple operations
- Error Handling: Handle network failures, authentication errors gracefully
- Reconnection: Implement retry logic with exponential backoff
- State Tracking: Monitor connection state for UI status indicators
- Multi-Hub: Track which hub is currently connected for multi-hub systems

CONNECTION WORKFLOW:
1. list_hubs → get available hubs
2. User selects hub → get IP and password
3. connect → establish session
4. get_devices → retrieve device list
5. set_temperature/control_switch → perform actions

COMMON ERRORS:
- "Connection refused": Hub IP incorrect or hub offline
- "Authentication failed": Wrong password or hub name
- "Timeout": Network connectivity issue or firewall blocking
- "Not found": Hub moved to different IP (use add_hub again)`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            host: {
                                type: 'string',
                                description: 'Gateway host IP address (e.g., 192.168.1.100). Obtain from list_hubs. Must be accessible on local network.'
                            },
                            password: {
                                type: 'string',
                                description: 'Gateway password - this is the hub name/ID (smile ID), an 8-character alphanumeric identifier like "glmpuuxg" printed on the physical device.'
                            }
                        },
                        required: ['host', 'password']
                    }
                },
                {
                    name: 'get_devices',
                    description: `Retrieve all devices and their real-time states from the connected Plugwise gateway. Foundation for coding agents building home automation monitoring, control interfaces, and data analytics.

CODING AGENT BENEFITS:
- Build real-time home automation dashboards and status displays
- Create device inventory and capability discovery systems
- Generate energy usage reports and analytics
- Develop automated monitoring and alerting systems
- Build zone-based temperature control interfaces
- Create historical data collection and trending systems
- Generate device health and maintenance reports
- Build smart scheduling based on current device states

DEVICE TYPES RETURNED:
1. THERMOSTATS (Anna, Lisa):
   - Current temperature (actual room temperature in °C)
   - Target temperature (setpoint in °C)
   - Active preset (home/away/vacation/sleep/comfort)
   - Heating demand (percentage 0-100%)
   - Valve position (for radiator valves)
   - Battery level (for wireless thermostats)
   - Location/zone assignment

2. GATEWAYS (Adam, Smile P1):
   - System mode (heating/cooling/off)
   - Gateway status and health
   - Active schedules
   - System capabilities
   - Firmware version
   - Network status

3. SWITCHES & PLUGS (Stretch):
   - Current state (on/off)
   - Power consumption (watts)
   - Cumulative energy usage (kWh)
   - Relay state
   - Lock state (manual override)

4. SENSORS:
   - Temperature readings
   - Humidity levels
   - Motion detection
   - Contact sensor states
   - Battery levels

DEVICE STATE STRUCTURE:
Each device includes:
- device_id: Unique identifier for control operations
- name: User-friendly device name
- type: Device category (thermostat/switch/sensor/gateway)
- location_id: Zone/room identifier
- capabilities: Available control functions
- state: Current operational state
- measurements: Real-time sensor readings

BEST PRACTICES FOR AI AGENTS:
- Polling: Call periodically (every 10-60 seconds) for real-time monitoring
- Caching: Store device list locally, refresh on state changes
- Device Selection: Use device_id for all control operations
- State Monitoring: Track changes to trigger automation rules
- Energy Analytics: Aggregate power/energy data for insights
- Comfort Optimization: Use temperature data for intelligent scheduling
- Zone Control: Group devices by location_id for room-based control
- Capability Detection: Check device capabilities before attempting control

COMMON USE CASES:
- Dashboard: Display all devices with current states in UI
- Temperature Control: Find thermostats, show current vs target temps
- Energy Monitoring: Sum power consumption across all switches
- Automation Triggers: Detect state changes to trigger other actions
- Scheduling: Build schedules based on device locations and types
- Diagnostics: Identify devices with low battery or connectivity issues

DATA STRUCTURE EXAMPLE:
{
  "device_id": "abc123",
  "name": "Living Room Thermostat",
  "type": "thermostat",
  "location_id": "living_room",
  "temperature": 21.5,
  "setpoint": 22.0,
  "preset": "home",
  "heating_demand": 65
}`,
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                },
                {
                    name: 'set_temperature',
                    description: `Set target temperature for a thermostat or heating zone. Core function for coding agents building intelligent climate control systems and energy optimization applications.

CODING AGENT BENEFITS:
- Build smart thermostat interfaces with temperature sliders and controls
- Create intelligent scheduling systems based on time, occupancy, weather
- Develop energy optimization algorithms that balance comfort and efficiency
- Generate automated temperature adjustment based on learned preferences
- Build zone-based heating control for multi-room comfort management
- Create temperature setback automation for energy savings
- Develop voice assistant integrations for temperature control
- Build predictive heating systems using weather forecasts

HOW IT WORKS:
- Sets the target temperature (setpoint) for a specific thermostat device or heating zone
- Temperature is specified in Celsius (°C)
- System adjusts heating to reach and maintain the target temperature
- Thermostat requests heat from boiler/HVAC based on difference between actual and target
- Change takes effect immediately, overriding any active schedule
- Can be combined with preset modes for automated temperature management

TEMPERATURE GUIDELINES:
- Typical range: 15-25°C (59-77°F)
- Comfort: 20-22°C (68-72°F) for living areas
- Energy saving: 18-19°C (64-66°F) for reduced heating
- Away/vacation: 15-16°C (59-61°F) to prevent freezing
- Night setback: 17-18°C (63-64°F) for bedrooms
- Precision: Supports decimal values (e.g., 21.5°C)

DEVICE IDENTIFICATION:
- device_id: Unique identifier from get_devices response
- Can be thermostat device ID OR location/zone ID
- For zone control: Use location_id to set temperature for entire zone
- For device control: Use device_id to set specific thermostat

BEST PRACTICES FOR AI AGENTS:
- Validation: Ensure temperature is within safe range (15-25°C typical)
- User Feedback: Confirm temperature change to user with before/after values
- State Refresh: Call get_devices after change to verify new setpoint
- Preset Awareness: Setting temperature may override active preset mode
- Zone vs Device: Prefer zone-based control for consistent room temperatures
- Gradual Changes: For automation, change temperature gradually (0.5°C increments)
- Schedule Interaction: Manual changes may override scheduled temperatures
- Energy Optimization: Consider outdoor temperature and insulation when setting targets

INTELLIGENT AUTOMATION EXAMPLES:
- Morning warmup: Increase temp 30 min before wake time
- Occupancy-based: Lower temp when no motion detected for 2 hours
- Weather-adaptive: Adjust target based on outdoor temperature forecast
- Energy price optimization: Lower temp during peak electricity rates
- Comfort learning: Adjust based on user manual override patterns
- Geofencing: Raise temp when resident approaching home
- Multi-zone optimization: Different temps for different room usage patterns

TEMPERATURE CONVERSION:
- Celsius to Fahrenheit: F = (C × 9/5) + 32
- Fahrenheit to Celsius: C = (F - 32) × 5/9
- Always send Celsius values to the API

ERROR HANDLING:
- Invalid device_id: Use get_devices to find valid IDs
- Out of range: Limit to manufacturer-specified min/max (usually 4-30°C)
- No permission: Some devices may be locked or in manual mode
- Device offline: Check device connectivity before setting temperature`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            device_id: {
                                type: 'string',
                                description: 'Device ID of the thermostat or location/zone ID. Obtain from get_devices response. Use location_id for zone-wide control or device_id for specific thermostat control.'
                            },
                            temperature: {
                                type: 'number',
                                description: 'Target temperature in Celsius (°C). Typical range: 15-25°C. Supports decimal precision (e.g., 21.5). Common values: 20°C (comfort), 18°C (eco), 15°C (away).'
                            }
                        },
                        required: ['device_id', 'temperature']
                    }
                },
                {
                    name: 'set_preset',
                    description: `Set thermostat preset mode for automated temperature management. Essential for coding agents building smart scheduling, occupancy detection, and lifestyle-based automation systems.

CODING AGENT BENEFITS:
- Build occupancy-based heating automation (home/away detection)
- Create vacation mode schedulers and energy-saving workflows
- Develop lifestyle preset selectors in user interfaces
- Generate automated preset switching based on calendar events
- Build geofencing automation (switch to home when approaching)
- Create voice assistant integrations for preset control
- Develop energy optimization workflows with preset scheduling
- Build smart home routines that combine multiple preset changes

WHAT ARE PRESETS:
Presets are pre-configured temperature profiles that combine setpoint temperatures with scheduling rules. They provide quick switching between different heating scenarios without manual temperature adjustment.

COMMON PRESET MODES:
1. HOME (Comfort):
   - Standard comfort temperature (typically 20-22°C)
   - Active when residents are present and awake
   - Normal heating schedule in effect
   - Full comfort mode with no energy savings

2. AWAY (Reduced):
   - Lower temperature to save energy (typically 15-18°C)
   - Activated when house is unoccupied
   - Reduces heating demand significantly
   - Prevents pipe freezing while minimizing energy use
   - Quick recovery when switching back to home

3. VACATION (Extended Away):
   - Minimal heating for extended absences (typically 10-15°C)
   - Frost protection mode
   - Maximum energy savings
   - Suitable for multi-day or week-long absences
   - Maintains minimal temperature to prevent damage

4. SLEEP (Night):
   - Reduced temperature for sleeping comfort (typically 16-18°C)
   - Activated during night hours
   - Balances comfort and energy savings
   - Bedroom-specific temperature settings
   - Automatic wake-up warmup available

5. COMFORT (Boost):
   - Temporarily increased temperature (typically 22-24°C)
   - Short-term comfort boost
   - Usually time-limited (returns to previous mode after timeout)
   - Useful for special occasions or temporary needs

6. NO FROST (Anti-Freeze):
   - Minimal heating to prevent freezing (typically 5-10°C)
   - Emergency or long-term absence mode
   - Protects plumbing and structure
   - Lowest energy consumption

DEVICE COMPATIBILITY:
- Works with all Plugwise thermostats (Anna, Lisa)
- Zone/location-based preset control for multi-room systems
- Gateway-wide preset modes for whole-home control
- Individual device presets for room-specific control

BEST PRACTICES FOR AI AGENTS:
- User Selection: Present preset options in UI with descriptions
- State Awareness: Get current preset from get_devices before changing
- Confirmation: Notify user which preset is now active
- Automation Logic: Use presets for rule-based automation triggers
- Geofencing: Away preset when all residents leave, Home when first arrives
- Calendar Integration: Vacation preset for planned trips
- Schedule Override: Manual preset selection overrides time-based schedules
- Quick Toggles: Build home/away toggle buttons for easy switching

INTELLIGENT AUTOMATION EXAMPLES:
- Occupancy: Motion sensor triggers → Home preset
- Geofencing: All phones leave geo-fence → Away preset
- Calendar: "Out of office" event → Vacation preset
- Time-based: Weekday 11pm → Sleep preset, 6am → Home preset
- Weather-adaptive: Extreme cold forecast → Comfort preset
- Energy optimization: High electricity rates → Away preset
- Voice control: "Alexa, set vacation mode" → Vacation preset
- Smart routines: "Goodnight" scene → Sleep preset + lights off

WORKFLOW EXAMPLES:
1. Manual Control:
   - User selects "Going out" → set_preset("away")
   - User returns home → set_preset("home")

2. Automated Geofencing:
   - Last person leaves home → detect → set_preset("away")
   - First person arrives → detect → set_preset("home")

3. Vacation Planning:
   - User books vacation → calendar sync → set_preset("vacation") on departure
   - Return home → auto-detect or scheduled → set_preset("home")

4. Night Routine:
   - 10:30 PM → automation trigger → set_preset("sleep")
   - 6:00 AM → automation trigger → set_preset("home")

PRESET VS TEMPERATURE:
- Presets: Pre-configured profiles with schedules and rules
- set_temperature: Direct setpoint control, may override preset
- Recommendation: Use presets for automation, temperature for fine-tuning
- Combining: Set preset first, then adjust temperature if needed

ERROR HANDLING:
- Invalid preset: Check gateway capabilities for available presets
- Device offline: Verify connectivity before setting preset
- Preset not supported: Some devices have limited preset options`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            device_id: {
                                type: 'string',
                                description: 'Device ID of the thermostat or location/zone ID. Obtain from get_devices. Use location_id for zone-wide preset or device_id for specific device.'
                            },
                            preset: {
                                type: 'string',
                                description: 'Preset mode to activate. Common values: "home" (comfort), "away" (reduced heating), "vacation" (extended absence), "sleep" (night mode), "comfort" (boost), "no_frost" (anti-freeze). Check gateway capabilities for available presets.'
                            }
                        },
                        required: ['device_id', 'preset']
                    }
                },
                {
                    name: 'control_switch',
                    description: `Control smart switches, relays, and appliances (on/off). Critical for coding agents building appliance automation, energy management, and smart home control systems.

CODING AGENT BENEFITS:
- Build smart plug control interfaces and dashboards
- Create appliance scheduling and timer systems
- Develop energy monitoring and optimization workflows
- Generate automated on/off routines based on conditions
- Build occupancy-based appliance control
- Create power consumption tracking and analytics
- Develop load shedding and demand response systems
- Build voice assistant integrations for appliance control

WHAT IT CONTROLS:
1. SMART PLUGS (Plug):
   - Individual appliances and devices
   - Lamps, fans, heaters, chargers
   - Any device plugged into a smart outlet
   - Power monitoring capability

2. RELAYS (Circle+, Stealth):
   - Built-in or in-wall relays
   - Permanently installed appliances
   - Lighting circuits
   - HVAC equipment
   - Water heaters, pumps

3. SWITCHES (Stretch controlled devices):
   - Wireless-controlled outlets
   - Remote switches and actuators
   - Multi-gang switch modules

HOW IT WORKS:
- Sends on/off command to specified device
- State: true = turn ON, false = turn OFF
- Command executes immediately
- Relay/switch physically opens or closes circuit
- Power is supplied or cut to connected appliance
- State can be verified with get_devices

SWITCH STATES:
- true / ON:
  * Relay closed, power flowing
  * Appliance receives electricity
  * LED indicator typically illuminated
  * Power consumption measurable

- false / OFF:
  * Relay open, power cut
  * Appliance de-energized
  * Zero power consumption (except switch itself)
  * LED indicator typically off or dim

BEST PRACTICES FOR AI AGENTS:
- State Verification: Call get_devices after control to confirm state change
- User Feedback: Show visual confirmation of on/off state in UI
- Toggle Function: Read current state first, then invert for toggle behavior
- Safety: Implement confirmation for critical appliances (heaters, etc.)
- Automation Guards: Prevent rapid on/off cycling (minimum delay between commands)
- Power Monitoring: Track energy usage before/after state changes
- Schedule Integration: Combine with time-based automation
- Manual Override: Respect physical button presses, don't override immediately

INTELLIGENT AUTOMATION EXAMPLES:
- Occupancy: Turn off when no motion detected for 30 minutes
- Scheduling: Turn on coffee maker at 6:30 AM weekdays
- Sunset/Sunrise: Turn on outdoor lights at sunset, off at sunrise
- Energy Optimization: Turn off high-power devices during peak rate hours
- Safety: Auto-off space heaters when temperature target reached
- Presence Simulation: Random on/off patterns when on vacation
- Load Management: Shed non-critical loads when total power exceeds threshold
- Voice Control: "Turn off bedroom lamp" → control_switch(lamp_id, false)

APPLIANCE CATEGORIES:
1. LIGHTING:
   - Lamps, floor lights, string lights
   - Safety: Safe to turn on/off frequently
   - Automation: Time-based, motion-based, sunrise/sunset

2. HEATING/COOLING:
   - Space heaters, portable AC units, fans
   - Safety: Monitor temperature, auto-off when target reached
   - Automation: Weather-based, schedule-based

3. ENTERTAINMENT:
   - TVs, speakers, game consoles
   - Power saving: Auto-off when not in use
   - Automation: Presence-based, activity-based

4. KITCHEN:
   - Coffee makers, kettles, slow cookers
   - Safety: Time-limited operation, temp monitoring
   - Automation: Morning routines, meal prep schedules

5. CHARGING:
   - Phone chargers, laptop chargers, EV chargers
   - Battery health: Turn off when fully charged
   - Automation: Charge during off-peak hours

POWER CONSUMPTION MONITORING:
- Read power usage from get_devices before/after switch operation
- Calculate energy savings from automated shutoff
- Generate usage reports and analytics
- Identify energy-hungry devices for optimization

SAFETY CONSIDERATIONS:
- Never control life-safety equipment (medical devices, security systems)
- Implement timeout shutoff for high-power heating devices
- Warn users before controlling critical appliances
- Respect manual overrides and physical switches
- Don't cycle switches rapidly (risk of relay damage)
- Consider inductive loads (motors, transformers) startup current

WORKFLOW EXAMPLES:
1. Simple On/Off:
   - User taps button → control_switch(device_id, true)
   - Confirmation → get_devices → verify state

2. Toggle:
   - get_devices → read current state
   - Invert state → control_switch(device_id, !current_state)

3. Scheduled Control:
   - Timer reaches 6:00 AM → control_switch(coffee_maker, true)
   - Timer reaches 6:30 AM → control_switch(coffee_maker, false)

4. Occupancy-Based:
   - Motion sensor: no activity 30 min → control_switch(lights, false)
   - Motion detected → control_switch(lights, true)

5. Energy Optimization:
   - Peak rate period starts → control_switch(non_essential, false)
   - Off-peak period starts → control_switch(non_essential, true)

ERROR HANDLING:
- Device offline: Check connectivity before sending command
- Invalid device_id: Use get_devices to find valid switch IDs
- Device locked: Some switches may be in manual override mode
- State mismatch: Verify state change succeeded with get_devices`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            device_id: {
                                type: 'string',
                                description: 'Device ID of the smart switch, plug, or relay. Obtain from get_devices response. Must be a controllable switch/relay device, not a sensor or thermostat.'
                            },
                            state: {
                                type: 'boolean',
                                description: 'Desired switch state. true = turn ON (relay closed, power flowing), false = turn OFF (relay open, power cut). Use for direct control or toggle by reading current state first.'
                            }
                        },
                        required: ['device_id', 'state']
                    }
                },
                {
                    name: 'set_gateway_mode',
                    description: `Set system-wide gateway operation mode. Foundation for coding agents building whole-home automation, occupancy detection, and lifestyle management systems.

CODING AGENT BENEFITS:
- Build whole-home automation with single-command mode switching
- Create occupancy-based system control (all zones at once)
- Develop vacation planning and energy-saving workflows
- Generate geofencing automation for entire home
- Build voice assistant whole-home mode commands
- Create energy optimization workflows affecting all zones
- Develop calendar-integrated vacation mode scheduling
- Build smart home routines that control entire heating system

WHAT IT DOES:
Sets the operational mode for the entire Plugwise gateway, affecting ALL connected thermostats and zones simultaneously. This is a system-wide setting that overrides individual zone presets.

AVAILABLE GATEWAY MODES:

1. HOME (Normal Operation):
   - Full comfort mode for all zones
   - All zones operate according to their schedules and presets
   - Normal heating demand and responsiveness
   - Recommended when residents are present and active
   - Maximum comfort, normal energy consumption
   - All smart features and schedules active

2. AWAY (Energy Saving):
   - Reduced heating for all zones (typically 15-18°C)
   - System-wide energy conservation mode
   - Heating demand significantly reduced across entire home
   - Prevents pipe freezing and maintains minimal comfort
   - Recommended for daily absences (work, school, errands)
   - Quick recovery when switching back to home mode
   - Moderate energy savings while maintaining quick warmup capability

3. VACATION (Extended Absence):
   - Minimal heating for all zones (typically 10-15°C)
   - Maximum energy savings system-wide
   - Frost protection mode for entire home
   - Heating system runs minimally to prevent damage
   - Recommended for multi-day or week-long absences
   - Significant energy savings (50-80% reduction typical)
   - Longer recovery time when returning to home mode
   - Protects plumbing, prevents mold/moisture issues

MODE BEHAVIOR:
- Gateway mode overrides all individual zone/device presets
- All thermostats adjust to mode-appropriate temperatures
- Schedules may be suspended or adjusted based on mode
- Mode persists until explicitly changed
- Some gateways support scheduled mode changes

BEST PRACTICES FOR AI AGENTS:
- System-Wide Control: Use gateway modes for whole-home scenarios
- Zone Control: Use set_preset for individual room control instead
- State Awareness: Call get_devices to see current gateway mode
- User Confirmation: Confirm mode change affects entire home
- Automation Integration: Combine with geofencing, calendar, occupancy
- Recovery Planning: Consider warmup time when returning from vacation
- Energy Analytics: Track energy savings from away/vacation modes
- Schedule Coordination: Document how modes interact with schedules

INTELLIGENT AUTOMATION EXAMPLES:
- Geofencing: Last person leaves → set_gateway_mode("away")
  First person arrives → set_gateway_mode("home")
- Calendar Integration: Vacation event starts → set_gateway_mode("vacation")
  Day before return → set_gateway_mode("home") for pre-warmup
- Occupancy Detection: No motion all zones 2+ hours → set_gateway_mode("away")
- Energy Optimization: High energy prices → set_gateway_mode("away") temporarily
- Weather-Responsive: Extreme cold forecasted → override to set_gateway_mode("home")
- Voice Commands: "Alexa, we're leaving" → set_gateway_mode("away")
- Smart Routines: "Goodnight" routine could optionally set away mode

GATEWAY MODE VS PRESET:
- Gateway Mode: Affects ENTIRE system, all zones simultaneously
- Preset (set_preset): Affects individual thermostat or zone
- Use Case: Gateway mode for whole-home situations (leaving, vacation)
           Preset for room-specific control (bedroom at night, etc.)
- Priority: Gateway mode typically overrides individual presets
- Recommendation: Use gateway modes for major state changes, presets for fine control

TYPICAL ENERGY SAVINGS:
- Home → Away: 20-40% energy reduction for short periods
- Home → Vacation: 50-80% energy reduction for extended periods
- Actual savings depend on: home insulation, outdoor temperature, absence duration

RECOVERY TIME CONSIDERATIONS:
- Away → Home: 30-60 minutes typical warmup time
- Vacation → Home: 2-4 hours typical warmup time
- Smart tip: Switch to home mode 2-4 hours before arrival after vacation

WORKFLOW EXAMPLES:
1. Leaving Home:
   - User locks door → automation detects → set_gateway_mode("away")
   - System reduces all zone temperatures
   - Energy savings begin immediately

2. Vacation Planning:
   - User selects vacation dates in app
   - Departure day → scheduled automation → set_gateway_mode("vacation")
   - Day before return → scheduled automation → set_gateway_mode("home")
   - Arrive to warm, comfortable home

3. Geofencing Automation:
   - All residents' phones leave geo-fence → detect absence
   - Wait 15 minutes (prevent false triggers)
   - set_gateway_mode("away")
   - First phone returns to geo-fence → set_gateway_mode("home")

4. Manual Control:
   - User asks: "We're going away for the weekend"
   - Agent suggests: set_gateway_mode("vacation")
   - User confirms → execute → energy savings enabled

ERROR HANDLING:
- Mode not supported: Check gateway capabilities (some models limited)
- Invalid mode: Use only "home", "away", "vacation" (lowercase)
- Connection required: Must call connect first before setting mode`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            mode: {
                                type: 'string',
                                description: 'Gateway mode to set. "home" = normal comfort operation for all zones; "away" = energy-saving mode for short absences; "vacation" = minimal heating for extended absences with maximum energy savings.',
                                enum: ['home', 'away', 'vacation']
                            }
                        },
                        required: ['mode']
                    }
                },
                {
                    name: 'set_dhw_mode',
                    description: `Set Domestic Hot Water (DHW) heating mode. Essential for coding agents building water heating control, energy optimization, and comfort management systems for homes with integrated water heaters.

CODING AGENT BENEFITS:
- Build water heater scheduling and optimization systems
- Create energy-efficient hot water management workflows
- Develop demand-based hot water boost functionality
- Generate hot water availability predictions and notifications
- Build integration with solar thermal or heat pump systems
- Create usage pattern learning and optimization
- Develop energy cost optimization for water heating
- Build voice assistant water heater control

WHAT IS DHW (DOMESTIC HOT WATER):
DHW refers to the hot water system for taps, showers, and baths - separate from the space heating system. Many Plugwise Adam gateways integrate with combi boilers or dedicated water heaters to control hot water production.

AVAILABLE DHW MODES:

1. AUTO (Automatic/Scheduled):
   - Hot water production follows programmed schedule
   - Heating times optimized for typical usage patterns
   - Energy-efficient: heats only when needed
   - Maintains set temperature during scheduled periods
   - Recommended for predictable usage patterns
   - Balances comfort and energy efficiency
   - Example: Heat from 6-9 AM and 5-10 PM on weekdays

2. BOOST (Temporary Maximum):
   - Immediate hot water heating to maximum temperature
   - Overrides schedule for temporary high demand
   - Time-limited (typically 1-3 hours, then returns to auto)
   - Use when extra hot water needed (guests, bath time, etc.)
   - Higher energy consumption during boost period
   - Ensures ample hot water availability quickly
   - Example: Activate before guests arrive for showers

3. COMFORT (Continuous Heating):
   - Hot water maintained at target temperature 24/7
   - Always-ready hot water supply
   - Maximum comfort and convenience
   - Highest energy consumption mode
   - Recommended only for high-demand scenarios
   - No waiting time for hot water
   - Example: Large family with frequent hot water needs

4. OFF (Disabled):
   - No hot water heating
   - DHW system completely disabled
   - Use only during extended absences (vacation)
   - Maximum energy savings for water heating
   - Space heating may still operate normally
   - Caution: No hot water available
   - Example: Summer vacation, all residents away

SYSTEM COMPATIBILITY:
- Requires Plugwise Adam gateway with DHW control capability
- Compatible with combi boilers with DHW integration
- Works with dedicated water heaters (tank or tankless)
- May integrate with solar thermal pre-heating
- Some systems support temperature setpoint adjustment

BEST PRACTICES FOR AI AGENTS:
- Mode Selection: Present options with energy/comfort trade-offs
- Schedule Awareness: Understand auto mode schedule before recommending
- Boost Duration: Inform users boost is time-limited
- Energy Impact: Warn about increased costs in comfort mode
- Vacation Planning: Suggest off mode for extended absences
- Usage Learning: Track patterns to optimize auto schedules
- Cost Optimization: Recommend boost during off-peak energy rates
- User Feedback: Notify when switching from boost back to auto

INTELLIGENT AUTOMATION EXAMPLES:
- Morning Routine: 6:00 AM → Ensure DHW in auto/comfort for showers
- Guest Mode: "Guests arriving" → set_dhw_mode("boost") for 2 hours
- Occupancy-Based: No motion detected 8+ hours → set_dhw_mode("off")
- Energy Price Optimization: High rate period → set_dhw_mode("auto"), Low rates → allow boost
- Vacation Planning: Departure → set_dhw_mode("off"), Return day → set_dhw_mode("auto")
- Voice Control: "We need extra hot water" → set_dhw_mode("boost")
- Calendar Integration: "Guests staying" event → set_dhw_mode("comfort") during visit

DHW MODE VS SPACE HEATING:
- Independent control: DHW mode doesn't affect space heating
- Gateway mode (home/away/vacation) may override DHW settings
- Both systems can operate simultaneously with different modes
- Energy optimization considers both systems

ENERGY CONSUMPTION COMPARISON:
- OFF: 0% DHW energy (space heating only)
- AUTO: 20-40% DHW energy (scheduled heating)
- BOOST: 50-80% DHW energy (temporary spike)
- COMFORT: 100% DHW energy (continuous heating)

TYPICAL SCHEDULES (AUTO MODE):
- Weekday: 6-9 AM, 5-10 PM (morning/evening routines)
- Weekend: 7-11 AM, 4-11 PM (more flexible timing)
- Customizable based on household patterns

BOOST MODE BEHAVIOR:
- Duration: Typically 1-3 hours (system-dependent)
- Temperature: Heats to maximum safe temperature (60-70°C)
- Auto-Return: Automatically returns to previous mode after timeout
- Manual Control: Can be cancelled early if needed

WORKFLOW EXAMPLES:
1. Daily Operation:
   - System in auto mode → follows schedule
   - get_devices → verify DHW schedule active
   - No action needed for normal operation

2. Special Occasion:
   - User: "We're having guests tonight"
   - Agent: set_dhw_mode("boost") → ample hot water ready
   - 2 hours later → system auto-returns to auto mode

3. Vacation:
   - Departure: set_gateway_mode("vacation") + set_dhw_mode("off")
   - Maximum energy savings for both systems
   - Return day: set_dhw_mode("auto") → hot water available on arrival

4. Energy Optimization:
   - Monitor energy prices
   - High rate period → ensure auto mode (minimize DHW heating)
   - Low rate period → allow boost requests
   - Cost savings while maintaining comfort

ERROR HANDLING:
- DHW not supported: Check gateway capabilities (Adam with DHW control)
- Invalid mode: Use only "auto", "boost", "comfort", "off"
- Connection required: Must connect to gateway first
- Mode not available: Some systems have limited mode options`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            mode: {
                                type: 'string',
                                description: 'DHW mode to set. "auto" = scheduled heating (energy-efficient); "boost" = temporary maximum heating (1-3 hours); "comfort" = continuous 24/7 heating (always ready); "off" = disabled (vacation mode).',
                            }
                        },
                        required: ['mode']
                    }
                },
                {
                    name: 'set_regulation_mode',
                    description: `Set HVAC regulation mode for advanced heating system control. For coding agents building sophisticated climate control systems with boiler/radiator management and maintenance workflows.

CODING AGENT BENEFITS:
- Build advanced HVAC control and optimization systems
- Create heating system maintenance and service workflows
- Develop radiator bleeding automation and reminders
- Generate system diagnostics and performance monitoring
- Build seasonal mode switching automation
- Create energy efficiency optimization workflows
- Develop heating system testing and validation tools
- Build integration with weather forecasting for preemptive control

WHAT IS REGULATION MODE:
Regulation mode controls HOW the heating system operates at the boiler/HVAC level. This is an advanced feature for systems with hydronic (water-based) heating like radiators, underfloor heating, or heat pumps.

AVAILABLE REGULATION MODES:

1. HEATING (Normal Operation):
   - Standard heating mode - system operates normally
   - Boiler/HVAC responds to thermostat heat demands
   - Radiators/heating circuits active and controlled
   - Maintains zone temperatures according to setpoints
   - Recommended for normal daily operation
   - Full climate control functionality enabled
   - Use during heating season (autumn/winter/spring)

2. OFF (System Disabled):
   - Heating system completely disabled
   - Boiler/HVAC will not fire even if thermostats call for heat
   - No heat circulation through radiators/floors
   - DHW (hot water) may still operate independently
   - Use during summer months when heating not needed
   - Maximum energy savings for space heating
   - Prevents unnecessary boiler cycling in warm weather
   - Safety: System can still be manually overridden at boiler

3. BLEEDING_COLD (Cold Radiator Purging):
   - Special maintenance mode for removing air from radiators
   - Circulates water through heating system WITHOUT boiler firing
   - Pumps run but no heat is generated
   - Allows air bubbles to collect at radiator bleed valves
   - Used during radiator bleeding maintenance procedure
   - Temporary mode - switch back to heating when done
   - Prevents burns during manual valve operation
   - Typically 10-30 minutes operation for proper bleeding

4. BLEEDING_HOT (Hot Radiator Purging):
   - Advanced maintenance mode with heated water circulation
   - Boiler fires to heat water during bleeding process
   - Hot water circulation helps dislodge stubborn air pockets
   - More effective than cold bleeding for some systems
   - CAUTION: Hot water - risk of burns during bleeding
   - Use for thorough system purging and maintenance
   - Temporary mode - return to heating after completion
   - May improve system efficiency after air removal

WHEN TO USE EACH MODE:

HEATING:
- Daily operation during cold months
- When zone temperature control is needed
- Anytime comfort heating is required
- Standard default mode for climate control

OFF:
- Summer months (no heating needed)
- Extended vacations in warm weather
- System maintenance (some procedures)
- Energy saving when heating not required
- Building is unoccupied for extended period

BLEEDING_COLD:
- Annual radiator maintenance (typically autumn)
- After filling/refilling the heating system
- When radiators are cold at top, warm at bottom (air trapped)
- When hearing gurgling/bubbling in radiators
- Seasonal preparation before heating season starts
- Safer option for DIY maintenance

BLEEDING_HOT:
- Professional maintenance scenarios
- Stubborn air pockets not removed by cold bleeding
- Initial system commissioning
- After major repairs or modifications
- When cold bleeding was insufficient
- Requires extra safety precautions (hot water)

SYSTEM COMPATIBILITY:
- Requires Plugwise Adam gateway with OpenTherm boiler
- Compatible with hydronic heating systems (radiators, underfloor)
- May work with heat pumps and other HVAC systems
- Not applicable to electric heating or simple thermostats

BEST PRACTICES FOR AI AGENTS:
- Seasonal Automation: Auto-switch to off in summer, heating in autumn
- Maintenance Reminders: Suggest bleeding mode during annual service
- Safety Warnings: Alert users about hot water when using bleeding_hot
- Temporary Modes: Remind users to return to heating after bleeding
- Weather Integration: Auto-switch to off when long-term warm forecast
- User Guidance: Provide radiator bleeding instructions when mode set
- Mode Verification: Confirm mode change with get_devices
- System Health: Monitor for signs that bleeding may be needed

RADIATOR BLEEDING PROCEDURE (AI AGENT GUIDE):
1. Notify user about the procedure and safety
2. set_regulation_mode("bleeding_cold") or "bleeding_hot"
3. Wait 10-15 minutes for circulation to stabilize
4. Instruct user to bleed radiators one by one (start highest floor)
5. User opens bleed valve until water flows (no air hissing)
6. Close valve, move to next radiator
7. After all radiators bled: set_regulation_mode("heating")
8. Check system pressure, top up if needed
9. Verify heating performance with get_devices

SIGNS THAT BLEEDING IS NEEDED:
- Radiators cold at top, warm at bottom
- Gurgling or bubbling sounds in radiators
- Some radiators not heating while others are hot
- Reduced heating efficiency
- Uneven heat distribution across zones
- Annual maintenance schedule (once per year typical)

INTELLIGENT AUTOMATION EXAMPLES:
- Seasonal: May 1st → set_regulation_mode("off"), Sept 15th → set_regulation_mode("heating")
- Weather-Based: 7-day forecast all >20°C → set_regulation_mode("off")
- Maintenance Reminder: Annual notification → "Time to bleed radiators" → offer to set mode
- Efficiency Monitoring: Detect poor performance → suggest bleeding procedure
- Vacation: Summer vacation → set_regulation_mode("off") + set_gateway_mode("vacation")

REGULATION MODE VS GATEWAY MODE:
- Regulation: Controls HOW heating system operates (boiler-level)
- Gateway: Controls WHEN/WHERE heating is needed (zone-level)
- Both Independent: Can be set separately
- Combined Use: Gateway mode "vacation" + Regulation "off" for maximum savings

ENERGY IMPACT:
- Heating: Normal energy consumption based on zone demands
- Off: Zero space heating energy (DHW may still consume)
- Bleeding modes: Minimal energy (pump operation only for cold, some for hot)

WORKFLOW EXAMPLES:
1. Summer Mode:
   - Warm weather arrives
   - set_regulation_mode("off")
   - Heating system disabled until autumn
   - Energy savings maximize

2. Radiator Maintenance:
   - User reports cold radiators
   - Agent: "Let's bleed the radiators"
   - set_regulation_mode("bleeding_cold")
   - Provide bleeding instructions
   - User completes bleeding
   - set_regulation_mode("heating")
   - Verify performance improved

3. Seasonal Automation:
   - Sept 15: set_regulation_mode("heating") → prepare for heating season
   - May 15: set_regulation_mode("off") → summer energy savings

ERROR HANDLING:
- Mode not supported: Check gateway/boiler capabilities
- Invalid mode: Use only "heating", "off", "bleeding_cold", "bleeding_hot"
- Safety: Warn about hot water when using bleeding_hot mode
- Connection required: Must connect to gateway first`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            mode: {
                                type: 'string',
                                description: 'Regulation mode to set. "heating" = normal operation; "off" = system disabled (summer mode); "bleeding_cold" = cold water circulation for radiator bleeding; "bleeding_hot" = hot water circulation for thorough radiator bleeding (caution: hot water).',
                            }
                        },
                        required: ['mode']
                    }
                },
                {
                    name: 'delete_notification',
                    description: `Clear system notifications and alerts from the Plugwise gateway. Essential for coding agents building notification management, system health monitoring, and user alert interfaces.

CODING AGENT BENEFITS:
- Build notification center and alert management interfaces
- Create automated notification processing and acknowledgment workflows
- Develop system health monitoring dashboards
- Generate notification analytics and trending reports
- Build alert prioritization and filtering systems
- Create notification forwarding to other platforms (email, SMS, push)
- Develop maintenance reminder and alert automation
- Build notification-based automation triggers

WHAT ARE GATEWAY NOTIFICATIONS:
Plugwise gateways generate notifications for various system events, errors, warnings, and informational messages. These appear in the gateway's web interface and mobile app, alerting users to conditions requiring attention.

NOTIFICATION TYPES:

1. ERROR NOTIFICATIONS:
   - Device offline or communication failure
   - Sensor battery critically low
   - Boiler error or malfunction
   - Network connectivity issues
   - System configuration problems
   - Thermostat temperature sensor failure
   - Urgent issues requiring immediate attention

2. WARNING NOTIFICATIONS:
   - Battery low (but not critical)
   - Device not responding intermittently
   - Schedule conflict or override
   - Unusual energy consumption patterns
   - Firmware update available
   - Maintenance due soon
   - Non-critical issues for user awareness

3. INFORMATIONAL NOTIFICATIONS:
   - Firmware update completed
   - Device added or removed
   - Schedule changed
   - Mode switched (manual vs automatic)
   - System status changes
   - General information, no action required

HOW IT WORKS:
- Without notification_id parameter: Clears ALL notifications
- With notification_id parameter: Clears specific notification
- Notification is acknowledged and removed from notification list
- Underlying issue may still exist (notification may reappear if not resolved)
- Use after addressing the root cause of the notification

BEST PRACTICES FOR AI AGENTS:
- Read First: Get notifications from get_devices before clearing
- User Visibility: Display notifications to user before clearing
- Selective Clearing: Clear specific notifications after addressing issue
- Root Cause: Guide user to fix underlying problem before clearing
- Bulk Clear: Use clear all for initial setup or after batch maintenance
- Logging: Record cleared notifications for historical tracking
- Automation: Auto-clear informational notifications, prompt for errors
- Verification: Check if notification reappears (indicates unresolved issue)

INTELLIGENT NOTIFICATION MANAGEMENT:

AUTO-CLEAR SCENARIOS:
- Informational notifications older than 7 days
- "Firmware update available" after update completed
- "Battery low" after battery replaced (confirmed by device state)
- One-time event notifications that are no longer relevant
- Notifications after verified issue resolution

USER PROMPT SCENARIOS:
- Error notifications (require user acknowledgment)
- Device offline alerts (until connectivity restored)
- Battery critical warnings (until battery replaced)
- Boiler errors (until service completed)
- Anything affecting system operation or safety

WORKFLOW EXAMPLES:

1. Review and Clear:
   - get_devices → retrieve notification list
   - Display to user with context and severity
   - User acknowledges → delete_notification(notification_id)
   - Verify resolution with get_devices

2. Bulk Maintenance:
   - System maintenance completed
   - delete_notification() → clear all notifications
   - Clean slate after addressing all issues

3. Automated Clearing:
   - Detect informational notification older than 7 days
   - Verify not critical
   - delete_notification(notification_id)
   - Log action for audit trail

4. Issue Resolution:
   - User reports "device offline" notification
   - Guide troubleshooting → device back online
   - Verify device state with get_devices
   - delete_notification(notification_id) → clear resolved alert

NOTIFICATION DATA STRUCTURE (from get_devices):
{
  "notification_id": "notif_12345",
  "type": "error|warning|info",
  "message": "Bedroom thermostat battery low",
  "device_id": "device_abc",
  "timestamp": "2025-10-26T10:30:00Z",
  "acknowledged": false
}

COMMON NOTIFICATIONS AND RESPONSES:

"Battery Low":
- Check battery level in device state
- If <10%: Notify user to replace battery
- After replacement: delete_notification(id)

"Device Offline":
- Check device communication in get_devices
- Troubleshoot connectivity
- If back online: delete_notification(id)
- If persistently offline: Keep notification, escalate to user

"Boiler Error":
- Critical - do not auto-clear
- Display error details to user
- Recommend professional service
- Clear only after user confirms resolution

"Firmware Update Available":
- Inform user about update
- If user declines: delete_notification(id)
- If user updates: Auto-clear after completion

"Schedule Override Active":
- Informational - user manually adjusted temperature
- Can auto-clear after 24 hours or when schedule resumes
- Low priority notification

NOTIFICATION ANALYTICS:
- Track notification frequency by type
- Identify recurring issues (device reliability)
- Generate maintenance schedules based on patterns
- Alert user to unusual notification spikes

SAFETY CONSIDERATIONS:
- Never auto-clear critical safety notifications
- Always inform user of errors before clearing
- Log all cleared notifications for audit
- Don't clear notifications if underlying issue persists
- Keep user in control of critical alerts

ERROR HANDLING:
- Invalid notification_id: Check current notifications from get_devices
- Notification already cleared: No error, idempotent operation
- Permission denied: Some notifications may be system-protected
- Connection required: Must connect to gateway first

INTEGRATION IDEAS:
- Email forwarding: Critical notifications → send email before clearing
- Push notifications: Mobile app alerts based on notification type
- IFTTT/Webhooks: Trigger other automations based on notifications
- Logging system: Archive all notifications before clearing
- Maintenance calendar: Schedule service based on notification history`,
                    inputSchema: {
                        type: 'object',
                        properties: {
                            notification_id: {
                                type: 'string',
                                description: 'Notification ID to delete/clear. Obtain from get_devices response. If not provided, clears ALL notifications. Use specific ID to acknowledge individual alerts after addressing the underlying issue.',
                            }
                        }
                    }
                },
                {
                    name: 'reboot_gateway',
                    description: `Reboot the Plugwise gateway/hub. Critical troubleshooting tool for coding agents building system maintenance, diagnostics, and recovery workflows.

CODING AGENT BENEFITS:
- Build automated troubleshooting and recovery workflows
- Create system maintenance and health check routines
- Develop firmware update automation (reboot after update)
- Generate scheduled maintenance procedures
- Build remote support and diagnostic tools
- Create system performance optimization workflows
- Develop uptime monitoring and recovery automation
- Build configuration change management (reboot after config changes)

WHAT IT DOES:
Performs a complete restart of the Plugwise gateway hardware and software. Similar to unplugging and reconnecting the power, but performed remotely via software command.

REBOOT PROCESS:
1. Gateway receives reboot command
2. Saves current state and configuration to persistent storage
3. Disconnects all active device connections
4. Shuts down all services and processes
5. Restarts hardware and firmware
6. Reloads configuration from storage
7. Re-establishes connections with all devices
8. System becomes available again (typically 1-3 minutes)

WHEN TO REBOOT:

TROUBLESHOOTING SCENARIOS:
- Gateway not responding or slow performance
- Devices not connecting or communicating erratically
- Network connectivity issues
- After multiple configuration changes
- Firmware update installation (may auto-reboot)
- Memory leak or resource exhaustion suspected
- System logs show errors or crashes
- Communication timeouts or delays
- Web interface not accessible

MAINTENANCE SCENARIOS:
- Scheduled monthly/quarterly maintenance
- After bulk device additions or removals
- Following major configuration changes
- Network infrastructure changes (router reboot, etc.)
- Post-firmware update (if not automatic)
- Seasonal preparation (beginning/end of heating season)
- Performance optimization (clear caches, reset connections)

NOT NEEDED FOR:
- Normal temperature changes (use set_temperature)
- Device on/off control (use control_switch)
- Preset or mode changes (use set_preset, set_gateway_mode)
- Adding/removing single devices
- Normal notification clearing

REBOOT EFFECTS:

WHAT PERSISTS (saved):
- All device configurations and pairings
- Zone/location assignments
- Schedules and automation rules
- Gateway settings and preferences
- User accounts and passwords
- Historical data and logs
- Firmware version

WHAT RESETS (temporary):
- Active network connections
- Current MCP server connection (must reconnect)
- Temporary state variables
- Cached device states (will refresh after reboot)
- Pending notifications (may clear)
- In-progress operations (cancelled)

DOWNTIME EXPECTATIONS:
- Gateway offline: 1-3 minutes typical
- Device reconnection: Additional 2-5 minutes
- Full system operational: 5-10 minutes total
- During this time: No remote control, schedules still run locally on devices

BEST PRACTICES FOR AI AGENTS:
- User Warning: Inform user about temporary loss of control
- Timing: Avoid rebooting during critical heating periods
- Confirm Intent: Always confirm before rebooting
- Reconnection: Automatically attempt reconnection after reboot
- Retry Logic: Implement exponential backoff for reconnection
- Status Monitoring: Check gateway status after reboot
- User Notification: Inform when system is back online
- Last Resort: Suggest other troubleshooting first

INTELLIGENT REBOOT WORKFLOWS:

AUTOMATED TROUBLESHOOTING:
1. Detect issue (device offline, slow response)
2. Attempt simpler fixes first (refresh device state)
3. If issue persists: Suggest reboot to user
4. User confirms → reboot_gateway()
5. Wait 3 minutes → attempt reconnect
6. Retry with exponential backoff (30s, 1m, 2m, 5m)
7. Verify issue resolved with get_devices
8. Notify user of outcome

SCHEDULED MAINTENANCE:
1. Monthly maintenance schedule (e.g., 1st of month, 3 AM)
2. Check system uptime (only if >30 days)
3. Notify user of planned reboot (or silent if approved)
4. reboot_gateway() at scheduled time
5. Monitor for successful restart
6. Verify all devices reconnected
7. Log maintenance completion

FIRMWARE UPDATE WORKFLOW:
1. Firmware update available notification
2. User approves update
3. Gateway downloads and installs firmware
4. reboot_gateway() to activate new firmware
5. Wait for restart (may take longer, 5-10 minutes)
6. Verify new firmware version
7. Check all devices functioning
8. Notify user of successful update

POST-REBOOT PROCEDURES:
1. Wait 3 minutes for gateway to fully boot
2. Attempt connect() with retry logic
3. Call get_devices() to verify system operational
4. Check all expected devices are connected
5. Verify no critical error notifications
6. Confirm schedules and automation active
7. Notify user system is healthy

SAFETY CONSIDERATIONS:
- Heating Impact: During winter, brief reboot won't significantly affect temperature
- Schedules Continue: Device-local schedules run independently during gateway reboot
- No Data Loss: Configuration and history preserved
- Remote Recovery: If reboot fails, may require physical power cycle
- Timing: Prefer non-critical times (not during extreme cold, not when expecting guests)

USER COMMUNICATION:
Before Reboot:
"I'll reboot the gateway to resolve this issue. The system will be offline for about 3-5 minutes. Heating schedules will continue to run locally on your thermostats during this time."

During Reboot:
"Gateway is rebooting... This usually takes 3-5 minutes. I'll automatically reconnect when it's ready."

After Successful Reboot:
"Gateway has successfully rebooted and all devices are connected. The issue should be resolved now."

If Reboot Fails:
"The gateway hasn't responded after reboot. Please check the physical device and power supply. You may need to manually power cycle it."

DIAGNOSTIC REBOOT:
- If persistent issues after reboot: Hardware problem likely
- If issues resolved: Software/state problem (addressed by reboot)
- Multiple reboots needed: Deeper investigation required
- Won't reboot: Gateway may be unresponsive (physical intervention needed)

WORKFLOW EXAMPLES:

1. Troubleshooting:
   - User: "Gateway is very slow"
   - Agent: "Let me reboot the gateway to clear any issues"
   - User confirms → reboot_gateway()
   - Wait 3 min → reconnect → verify performance

2. Firmware Update:
   - Notification: "Firmware update available"
   - User approves update
   - Gateway updates firmware
   - reboot_gateway() → activate new version
   - Verify update successful

3. Scheduled Maintenance:
   - Monthly schedule triggers (3 AM, 1st of month)
   - reboot_gateway() → preventive maintenance
   - Auto-reconnect → verify health
   - Log completion

ERROR HANDLING:
- Reboot command sent but no response: Wait longer, gateway may be processing
- Can't reconnect after 10 minutes: Suggest physical power cycle
- Connection lost during reboot: Expected, implement reconnection logic
- Frequent reboots needed: Investigate root cause (hardware issue, network problem)`,
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                }
            ]
        }));

        // Set up tool call handler
        this.server.setRequestHandler(
            CallToolRequestSchema,
            async (request: CallToolRequest) => this.handleToolCall(request)
        );
    }

    private async handleToolCall(request: CallToolRequest) {
        const { name, arguments: args } = request.params;

        try {
            switch (name) {
                case 'add_hub':
                    return await this.handleAddHub(args);
                case 'list_hubs':
                    return await this.handleListHubs(args);
                case 'connect':
                    return await this.handleConnect(args);
                case 'get_devices':
                    return await this.handleGetDevices(args);
                case 'set_temperature':
                    return await this.handleSetTemperature(args);
                case 'set_preset':
                    return await this.handleSetPreset(args);
                case 'control_switch':
                    return await this.handleControlSwitch(args);
                case 'set_gateway_mode':
                    return await this.handleSetGatewayMode(args);
                case 'set_dhw_mode':
                    return await this.handleSetDhwMode(args);
                case 'set_regulation_mode':
                    return await this.handleSetRegulationMode(args);
                case 'delete_notification':
                    return await this.handleDeleteNotification(args);
                case 'reboot_gateway':
                    return await this.handleRebootGateway(args);
                default:
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Unknown tool: ${name}`
                            }
                        ]
                    };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error instanceof Error ? error.message : String(error)}`
                    }
                ],
                isError: true
            };
        }
    }

    // Tool handlers
    private async handleAddHub(args: unknown) {
        const hubName = typeof args === 'object' && args !== null && 'hubName' in args
            ? (args.hubName as string)
            : undefined;

        // Validate input
        if (!hubName || hubName.trim() === '') {
            const syntaxMessage = `❌ Hub name is required.

Usage: Call add_hub tool with hubName parameter

Example: { "hubName": "glmpuuxg" }

The hub name is the unique identifier/password for your Plugwise hub.`;

            return {
                content: [
                    {
                        type: 'text',
                        text: syntaxMessage
                    }
                ]
            };
        }

        try {
            const result = await this.discoveryService.addHubByName(hubName.trim());

            if (result.success && result.hub) {
                const successMessage = `✅ Hub found and added successfully!

Hub Details:
  Name: ${result.hub.name}
  IP: ${result.hub.ip}
  Model: ${result.hub.model || 'Unknown'}
  Firmware: ${result.hub.firmware || 'Unknown'}

The hub has been saved to: /hubs/${hubName}.json`;

                return {
                    content: [
                        {
                            type: 'text',
                            text: successMessage
                        }
                    ]
                };
            } else {
                const errorMessage = result.error || 'Hub not found on the network';
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ ${errorMessage}`
                        }
                    ],
                    isError: true
                };
            }
        } catch (error) {
            const errorMessage = `Error adding hub: ${(error as Error).message}`;
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ ${errorMessage}`
                    }
                ],
                isError: true
            };
        }
    }

    private async handleListHubs(args: unknown) {
        try {
            // Load hubs from files if not already loaded
            await this.discoveryService.loadAllHubsFromFiles();

            const hubs = this.discoveryService.getDiscoveredHubs();

            if (hubs.length === 0) {
                const message = `📋 No hubs registered yet.\n\nUse /addhub <hub-name> to add a new hub.`;

                return {
                    content: [
                        {
                            type: 'text',
                            text: message
                        }
                    ]
                };
            }

            // Format hub list
            const hubList = hubs.map((hub, index) =>
                `  ${index + 1}. ${hub.name}\n     IP: ${hub.ip}\n     Model: ${hub.model || 'Unknown'}\n     Firmware: ${hub.firmware || 'Unknown'}`
            ).join('\n\n');

            const message = `📋 Registered Hubs (${hubs.length})\n\n${hubList}\n\nUse /connect with the IP address to connect to a hub.`;

            return {
                content: [
                    {
                        type: 'text',
                        text: message
                    }
                ]
            };
        } catch (error) {
            const errorMessage = `Error listing hubs: ${(error as Error).message}`;
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ ${errorMessage}`
                    }
                ],
                isError: true
            };
        }
    }

    private async handleConnect(args: unknown) {
        if (typeof args !== 'object' || args === null || !('host' in args) || !('password' in args)) {
            throw new Error('Host and password are required');
        }

        const host = args.host as string;
        const password = args.password as string;

        try {
            const config = { host, password };
            const client = await this.connectionService.connect(config);
            const gatewayInfo = client.getGatewayInfo();

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Connected successfully',
                            gateway_info: gatewayInfo
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleGetDevices(args: unknown) {
        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            const devices = await client.getDevices();
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            devices: devices
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetTemperature(args: unknown) {
        if (typeof args !== 'object' || args === null || !('device_id' in args) || !('temperature' in args)) {
            throw new Error('Device ID and temperature are required');
        }

        const deviceId = args.device_id as string;
        const temperature = args.temperature as number;

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setTemperature({
                location_id: deviceId,
                setpoint: temperature
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Temperature set to ${temperature}°C for device ${deviceId}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetPreset(args: unknown) {
        if (typeof args !== 'object' || args === null || !('device_id' in args) || !('preset' in args)) {
            throw new Error('Device ID and preset are required');
        }

        const deviceId = args.device_id as string;
        const preset = args.preset as string;

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setPreset(deviceId, preset);

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Preset set to ${preset} for device ${deviceId}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleControlSwitch(args: unknown) {
        if (typeof args !== 'object' || args === null || !('device_id' in args) || !('state' in args)) {
            throw new Error('Device ID and state are required');
        }

        const deviceId = args.device_id as string;
        const state = args.state as boolean;

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setSwitchState({
                appliance_id: deviceId,
                state: state ? 'on' : 'off'
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Switch ${state ? 'turned on' : 'turned off'} for device ${deviceId}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetGatewayMode(args: unknown) {
        if (typeof args !== 'object' || args === null || !('mode' in args)) {
            throw new Error('Mode is required');
        }

        const mode = args.mode as string;
        const validModes = ['home', 'away', 'vacation'];

        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
        }

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setGatewayMode(mode as 'home' | 'away' | 'vacation');

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Gateway mode set to ${mode}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetDhwMode(args: unknown) {
        if (typeof args !== 'object' || args === null || !('mode' in args)) {
            throw new Error('Mode is required');
        }

        const mode = args.mode as string;
        const validModes = ['auto', 'boost', 'comfort', 'off'];

        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
        }

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setDHWMode(mode as 'auto' | 'boost' | 'comfort' | 'off');

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `DHW mode set to ${mode}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleSetRegulationMode(args: unknown) {
        if (typeof args !== 'object' || args === null || !('mode' in args)) {
            throw new Error('Mode is required');
        }

        const mode = args.mode as string;
        const validModes = ['heating', 'off', 'bleeding_cold', 'bleeding_hot'];

        if (!validModes.includes(mode)) {
            throw new Error(`Invalid mode. Must be one of: ${validModes.join(', ')}`);
        }

        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.setRegulationMode(mode as 'heating' | 'off' | 'bleeding_cold' | 'bleeding_hot');

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: `Regulation mode set to ${mode}`
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleDeleteNotification(args: unknown) {
        // The client's deleteNotifications() method doesn't take parameters
        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.deleteNotification();

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'All notifications cleared'
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    private async handleRebootGateway(args: unknown) {
        try {
            const client = this.connectionService.getClient();
            if (!client) {
                throw new Error('Not connected to gateway. Use connect tool first.');
            }

            await client.rebootGateway();

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Gateway reboot initiated'
                        }, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: error instanceof Error ? error.message : String(error)
                        }, null, 2)
                    }
                ],
                isError: true
            };
        }
    }

    async run(): Promise<void> {
        const config = getServerConfig();

        // Load HUB configurations from .env
        await this.discoveryService.loadFromEnvironment();

        console.error('\n🚀 Plugwise MCP Server started!');
        console.error('\nAvailable Tools:');
        console.error('  - add_hub: Add a new hub by name (scans network and saves to /hubs folder)');
        console.error('  - list_hubs: List all registered hubs');
        console.error('  - connect: Connect to Plugwise gateway');
        console.error('  - get_devices: Get all devices and their states');
        console.error('  - set_temperature: Set thermostat temperature');
        console.error('  - set_preset: Set thermostat preset mode');
        console.error('  - control_switch: Control switches/relays');
        console.error('  - set_gateway_mode: Set gateway mode (home/away/vacation)');
        console.error('  - set_dhw_mode: Set domestic hot water mode');
        console.error('  - set_regulation_mode: Set heating regulation mode');
        console.error('  - delete_notification: Clear gateway notifications');
        console.error('  - reboot_gateway: Reboot the gateway');
        console.error('\nAvailable Resources:');
        console.error('  - plugwise://devices: Current device states');
        console.error('\nAvailable Prompts:');
        console.error('  - setup_guide: Get setup instructions');

        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }
}
