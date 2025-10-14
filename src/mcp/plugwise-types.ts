/**
 * TypeScript type definitions for Plugwise API
 * Based on https://github.com/plugwise/python-plugwise
 */

export interface PlugwiseConfig {
    host: string;
    password: string;
    port?: number;
    username?: string;
    timeout?: number;
}

export interface SmileSensors {
    battery?: number;
    cooling_activation_outdoor_temperature?: number;
    cooling_deactivation_threshold?: number;
    dhw_temperature?: number;
    domestic_hot_water_setpoint?: number;
    temperature?: number;
    electricity_consumed?: number;
    electricity_consumed_interval?: number;
    electricity_consumed_peak_point?: number;
    electricity_consumed_off_peak_point?: number;
    electricity_produced?: number;
    electricity_produced_interval?: number;
    electricity_phase_one_consumed?: number;
    electricity_phase_two_consumed?: number;
    electricity_phase_three_consumed?: number;
    gas_consumed_cumulative?: number;
    gas_consumed_interval?: number;
    humidity?: number;
    illuminance?: number;
    intended_boiler_temperature?: number;
    modulation_level?: number;
    outdoor_air_temperature?: number;
    outdoor_temperature?: number;
    return_temperature?: number;
    setpoint?: number;
    setpoint_high?: number;
    setpoint_low?: number;
    temperature_difference?: number;
    valve_position?: number;
    voltage_phase_one?: number;
    voltage_phase_two?: number;
    voltage_phase_three?: number;
    water_pressure?: number;
    water_temperature?: number;
}

export interface SmileBinarySensors {
    compressor_state?: boolean;
    cooling_enabled?: boolean;
    cooling_state?: boolean;
    dhw_state?: boolean;
    flame_state?: boolean;
    heating_state?: boolean;
    low_battery?: boolean;
    plugwise_notification?: boolean;
    secondary_boiler_state?: boolean;
}

export interface SmileSwitches {
    cooling_ena_switch?: boolean;
    dhw_cm_switch?: boolean;
    lock?: boolean;
    relay?: boolean;
}

export interface ActuatorData {
    lower_bound?: number;
    resolution?: number;
    setpoint?: number;
    setpoint_high?: number;
    setpoint_low?: number;
    upper_bound?: number;
}

export interface GatewayEntity {
    // Appliance base data
    dev_class?: string;
    firmware?: string;
    hardware?: string;
    location?: string;
    mac_address?: string;
    members?: string[];
    model?: string;
    model_id?: string;
    name: string;
    vendor?: string;
    zigbee_mac_address?: string;

    // Device availability
    available?: boolean;

    // Gateway modes
    gateway_modes?: string[];
    select_gateway_mode?: string;
    regulation_modes?: string[];
    select_regulation_mode?: string;

    // DHW modes
    dhw_modes?: string[];
    select_dhw_mode?: string;

    // Notifications
    notifications?: Record<string, Record<string, string>>;

    // Thermostat-related
    thermostats?: Record<string, string[]>;
    active_preset?: string;
    preset_modes?: string[];
    available_schedules?: string[];
    select_schedule?: string;
    climate_mode?: string;
    control_state?: string;

    // Measurements
    binary_sensors?: SmileBinarySensors;
    sensors?: SmileSensors;
    switches?: SmileSwitches;

    // Actuators
    max_dhw_temperature?: ActuatorData;
    maximum_boiler_temperature?: ActuatorData;
    temperature_offset?: ActuatorData;
    thermostat?: ActuatorData;
}

export interface GatewayInfo {
    hostname?: string;
    hw_version?: string;
    legacy: boolean;
    mac_address?: string;
    model: string;
    model_id?: string;
    name: string;
    type: string;
    version: string;
    zigbee_mac_address?: string;
}

export interface PlugwiseData {
    gateway_id: string;
    heater_id?: string;
    gateway_info: GatewayInfo;
    entities: Record<string, GatewayEntity>;
}

export interface SetTemperatureParams {
    location_id: string;
    setpoint?: number;
    setpoint_high?: number;
    setpoint_low?: number;
}

export interface SetSwitchParams {
    appliance_id: string;
    state: 'on' | 'off';
    model?: string;
}

export type GatewayMode = 'home' | 'away' | 'vacation';
export type DHWMode = 'auto' | 'boost' | 'comfort' | 'off';
export type RegulationMode = 'heating' | 'off' | 'bleeding_cold' | 'bleeding_hot';

export class PlugwiseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PlugwiseError';
    }
}

export class ConnectionError extends PlugwiseError {
    constructor(message: string) {
        super(message);
        this.name = 'ConnectionError';
    }
}

export class AuthenticationError extends PlugwiseError {
    constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
    }
}

export class InvalidSetupError extends PlugwiseError {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidSetupError';
    }
}
