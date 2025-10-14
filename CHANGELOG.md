# Changelog

All notable changes to the Plugwise MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial npm package setup for publication

## [1.0.0] - 2024-10-14

### Added
- Full MCP protocol support with HTTP transport
- Automatic network scanning for Plugwise hubs
- Multi-hub management capabilities
- Device control tools (temperature, switches, presets)
- Gateway management tools (modes, DHW, regulation)
- MCP resources for device state
- Setup guide prompt
- Comprehensive documentation
- Test scripts for all functionality

### Features
- **Network Discovery**
  - `scan_network`: Automatic hub discovery with .env password support
  - Fast scanning using known IP addresses
  - Credential storage for auto-connection

- **Device Management**
  - `get_devices`: Retrieve all devices and states
  - `control_switch`: Control switches and smart plugs
  
- **Climate Control**
  - `set_temperature`: Set thermostat setpoints
  - `set_preset`: Change climate presets (home/away/sleep/vacation)
  - `get_temperature`: Read temperature and setpoint
  - `get_all_temperatures`: Read all thermostats
  - `get_temperature_offset`: Read temperature calibration
  - `set_temperature_offset`: Set temperature calibration

- **Gateway Control**
  - `set_gateway_mode`: Set gateway mode (home/away/vacation)
  - `set_dhw_mode`: Control domestic hot water
  - `set_regulation_mode`: Set heating regulation
  - `delete_notification`: Clear notifications
  - `reboot_gateway`: Reboot gateway

### Supported Devices
- **Gateways**: Adam, Anna, Smile P1, Stretch
- **Thermostats**: Anna, Lisa, Tom/Floor
- **Sensors**: Jip (motion, illuminance)
- **Switches**: Plug, Circle, Aqara Plug
- **Valves**: Lisa, Koen

### Documentation
- Complete README with setup instructions
- Network scanning guide
- Temperature tools implementation guide
- Architecture documentation
- Multi-hub testing guide
- Test script documentation

[Unreleased]: https://github.com/Tommertom/plugwise-mcp-server/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Tommertom/plugwise-mcp-server/releases/tag/v1.0.0
