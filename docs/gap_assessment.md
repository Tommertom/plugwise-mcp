# Gap Assessment: Plugwise MCP Server vs Home Assistant Integration

This document outlines the gaps identified between the current Plugwise MCP server implementation and the reference Home Assistant integration (`python-plugwise`).

## 1. Log Parsing Limitations

**Current Status:**
The `PlugwiseClient.parseMeasurements` method in `src/client/plugwise-client.ts` only processes `point_log` entries.

**Missing Functionality:**
- **Cumulative Logs (`cumulative_log`)**: Required for reading total energy and gas consumption counters (e.g., `electricity_consumed_off_peak_cumulative`, `gas_consumed_cumulative`).
- **Interval Logs (`interval_log`)**: Required for reading consumption over time intervals (e.g., `electricity_consumed_interval`).

**Reference:**
In `python-plugwise/plugwise/helper.py`, the `_appliance_measurements` method iterates through `point_log`, `cumulative_log`, and `interval_log`.

## 2. Missing P1 Smart Meter Measurements

**Current Status:**
The current implementation ignores P1 smart meter specific data.

**Missing Measurements:**
The following measurements defined in `python-plugwise/plugwise/constants.py` (`P1_MEASUREMENTS`) are not being parsed:

- **Electricity Consumption:**
  - `electricity_consumed` (Current power usage)
  - `electricity_consumed_off_peak_cumulative`
  - `electricity_consumed_peak_cumulative`
  - `electricity_consumed_off_peak_interval`
  - `electricity_consumed_peak_interval`
  - `electricity_consumed_point`
- **Electricity Production:**
  - `electricity_produced`
  - `electricity_produced_off_peak_cumulative`
  - `electricity_produced_peak_cumulative`
  - `electricity_produced_off_peak_interval`
  - `electricity_produced_peak_interval`
  - `electricity_produced_point`
- **Phase Data:**
  - `electricity_phase_one_consumed`, `electricity_phase_two_consumed`, `electricity_phase_three_consumed`
  - `electricity_phase_one_produced`, `electricity_phase_two_produced`, `electricity_phase_three_produced`
  - `voltage_phase_one`, `voltage_phase_two`, `voltage_phase_three`
- **Gas:**
  - `gas_consumed_cumulative`
  - `gas_consumed_interval`

## 3. Type Definitions

**Current Status:**
The `SmileSensors` interface in `src/types/plugwise-types.ts` is incomplete.

**Missing Fields:**
- Detailed phase data (voltages and power per phase).
- Peak vs Off-peak specific fields.
- Net electricity fields (`net_electricity_cumulative`, `net_electricity_point`).

## 4. Device Class Handling

**Current Status:**
The client treats all devices similarly using `parseAppliance`.

**Missing Functionality:**
- **SmartMeter Handling**: The `python-plugwise` library has specific logic for `smartmeter` device class (P1), including handling it via the "Home" location for some firmware versions (`_get_p1_smartmeter_info`).
- **Gateway/Heater Separation**: The python code explicitly separates Gateway, Heater Central, and P1 SmartMeter logic, whereas the MCP client is more generic.

## 5. Recommendations

1.  **Update `parseMeasurements`**: Modify `src/client/plugwise-client.ts` to iterate over `cumulative_log` and `interval_log` in addition to `point_log`.
2.  **Expand `SmileSensors`**: Update `src/types/plugwise-types.ts` to include all P1 measurements.
3.  **Implement P1 Logic**: Add specific handling for P1 measurements in the parsing logic, mapping the XML log types to the correct sensor names (e.g., mapping `electricity_consumed` from a cumulative log to `electricity_consumed_cumulative`).
