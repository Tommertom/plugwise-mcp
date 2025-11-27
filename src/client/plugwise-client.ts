/**
 * Plugwise HTTP Client
 * Implementation based on https://github.com/plugwise/python-plugwise
 * 
 * This client communicates with Plugwise gateways (Adam, Anna, Smile P1, Stretch)
 * via their HTTP XML API.
 */

import { parseStringPromise } from 'xml2js';
import {
    PlugwiseConfig,
    PlugwiseData,
    GatewayEntity,
    GatewayInfo,
    SetTemperatureParams,
    SetSwitchParams,
    GatewayMode,
    DHWMode,
    RegulationMode,
    ConnectionError,
    AuthenticationError,
    PlugwiseError
} from '../types/plugwise-types.js';

const DEFAULT_PORT = 80;
const DEFAULT_USERNAME = 'smile';
const DEFAULT_TIMEOUT = 10000;

export class PlugwiseClient {
    private config: Required<PlugwiseConfig>;
    private connected: boolean = false;
    private gatewayId: string = '';
    private heaterId: string = '';
    private gatewayInfo: GatewayInfo | null = null;

    constructor(config: PlugwiseConfig) {
        this.config = {
            host: config.host,
            password: config.password,
            port: config.port || DEFAULT_PORT,
            username: config.username || DEFAULT_USERNAME,
            timeout: config.timeout || DEFAULT_TIMEOUT
        };
    }

    /**
     * Make an HTTP request to the Plugwise gateway
     */
    private async request(
        endpoint: string,
        method: 'GET' | 'PUT' | 'POST' | 'DELETE' = 'GET',
        data?: string
    ): Promise<string> {
        const url = `http://${this.config.host}:${this.config.port}${endpoint}`;
        const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'text/xml',
                },
                body: data,
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (response.status === 401) {
                throw new AuthenticationError('Invalid credentials');
            }

            if (!response.ok) {
                throw new ConnectionError(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.text();
        } catch (error) {
            clearTimeout(timeout);
            if (error instanceof AuthenticationError || error instanceof ConnectionError) {
                throw error;
            }
            if ((error as Error).name === 'AbortError') {
                throw new ConnectionError('Request timeout');
            }
            throw new ConnectionError(`Failed to connect to Plugwise gateway: ${(error as Error).message}`);
        }
    }

    /**
     * Parse XML response to JavaScript object
     */
    private async parseXml(xml: string): Promise<any> {
        try {
            return await parseStringPromise(xml, {
                explicitArray: false,
                mergeAttrs: true,
                trim: true
            });
        } catch (error) {
            throw new PlugwiseError(`Failed to parse XML: ${(error as Error).message}`);
        }
    }

    /**
     * Extract text value from XML element
     */
    private getXmlValue(obj: any, path: string): any {
        const parts = path.split('.');
        let current = obj;
        for (const part of parts) {
            if (current === undefined || current === null) return undefined;
            current = current[part];
        }
        return current;
    }

    /**
     * Connect to the Plugwise gateway and detect device type
     */
    async connect(): Promise<GatewayInfo> {
        try {
            // Request domain objects to identify the gateway
            const xml = await this.request('/core/domain_objects');
            const data = await this.parseXml(xml);

            // Extract gateway information
            const gateway = this.getXmlValue(data, 'domain_objects.gateway');

            if (!gateway) {
                throw new PlugwiseError('No gateway information found');
            }

            // Parse gateway details
            this.gatewayInfo = {
                hostname: gateway.hostname || 'unknown',
                hw_version: gateway.hardware_version || undefined,
                legacy: false,
                mac_address: gateway.mac_address || undefined,
                model: gateway.vendor_model || 'Unknown',
                model_id: gateway.vendor_model || undefined,
                name: gateway.name || 'Plugwise Gateway',
                type: this.detectGatewayType(gateway),
                version: gateway.firmware_version || '0.0.0',
                zigbee_mac_address: undefined
            };

            // Find gateway and heater IDs
            const appliances = this.getXmlValue(data, 'domain_objects.appliance');
            if (appliances) {
                const applianceArray = Array.isArray(appliances) ? appliances : [appliances];
                for (const appliance of applianceArray) {
                    const type = appliance.type;
                    if (type === 'gateway') {
                        this.gatewayId = appliance.id;
                    } else if (type === 'heater_central') {
                        this.heaterId = appliance.id;
                    }
                }
            }

            this.connected = true;
            return this.gatewayInfo!;
        } catch (error) {
            this.connected = false;
            if (error instanceof PlugwiseError) {
                throw error;
            }
            throw new ConnectionError(`Failed to connect: ${(error as Error).message}`);
        }
    }

    /**
     * Detect the type of gateway (Adam, Anna, Smile P1, Stretch)
     */
    private detectGatewayType(gateway: any): string {
        const model = gateway.vendor_model || '';
        const version = gateway.firmware_version || '';

        if (model.includes('159')) return 'thermostat'; // Adam
        if (model.includes('143')) return 'thermostat'; // Anna
        if (version.includes('smile_v')) return 'power'; // Smile P1
        if (version.includes('stretch_v')) return 'stretch'; // Stretch

        return 'unknown';
    }

    /**
     * Get all devices and their current state
     */
    async getDevices(): Promise<PlugwiseData> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        try {
            const xml = await this.request('/core/domain_objects');
            const data = await this.parseXml(xml);

            const entities: Record<string, GatewayEntity> = {};

            // Parse appliances (devices)
            const appliances = this.getXmlValue(data, 'domain_objects.appliance');
            if (appliances) {
                const applianceArray = Array.isArray(appliances) ? appliances : [appliances];
                for (const appliance of applianceArray) {
                    const entity = this.parseAppliance(appliance);
                    if (entity) {
                        entities[appliance.id] = entity;
                    }
                }
            }

            // Parse locations (zones/rooms)
            const locations = this.getXmlValue(data, 'domain_objects.location');
            if (locations) {
                const locationArray = Array.isArray(locations) ? locations : [locations];
                for (const location of locationArray) {
                    const entity = this.parseLocation(location);
                    if (entity) {
                        entities[location.id] = entity;
                    }
                }
            }

            return {
                gateway_id: this.gatewayId,
                heater_id: this.heaterId,
                gateway_info: this.gatewayInfo!,
                entities
            };
        } catch (error) {
            if (error instanceof PlugwiseError) {
                throw error;
            }
            throw new PlugwiseError(`Failed to get devices: ${(error as Error).message}`);
        }
    }

    /**
     * Parse appliance data into GatewayEntity
     */
    private parseAppliance(appliance: any): GatewayEntity | null {
        try {
            const entity: GatewayEntity = {
                name: appliance.name || 'Unknown Device',
                dev_class: appliance.type || 'unknown',
                model: appliance.vendor_model || undefined,
                vendor: appliance.vendor_name || undefined,
                firmware: appliance.firmware_version || undefined,
                hardware: appliance.hardware_version || undefined,
                mac_address: appliance.mac_address || undefined,
                available: true,
                sensors: {},
                binary_sensors: {},
                switches: {}
            };

            // Parse measurements (sensors)
            this.parseMeasurements(appliance, entity);

            // Parse actuators (switches, thermostats)
            this.parseActuators(appliance, entity);

            return entity;
        } catch (error) {
            console.error('Failed to parse appliance:', error);
            return null;
        }
    }

    /**
     * Parse location data into GatewayEntity
     */
    private parseLocation(location: any): GatewayEntity | null {
        try {
            const entity: GatewayEntity = {
                name: location.name || 'Unknown Location',
                dev_class: 'zone',
                available: true,
                sensors: {},
                binary_sensors: {},
                switches: {}
            };

            // Parse preset and schedule information
            if (location.preset) {
                entity.active_preset = location.preset;
            }

            // Parse measurements from logs
            this.parseMeasurements(location, entity);

            return entity;
        } catch (error) {
            console.error('Failed to parse location:', error);
            return null;
        }
    }

    /**
     * Parse measurements from appliance/location
     */
    private parseMeasurements(source: any, entity: GatewayEntity): void {
        if (!source.logs) return;
        if (!entity.sensors) entity.sensors = {};

        // Helper to process a list of logs
        const processLogs = (logList: any[], suffix: string = '') => {
            for (const log of logList) {
                if (!log.type) continue;

                // Get measurement - handle both direct text and period structure
                let measurementValue: any;
                if (log.period && log.period.measurement) {
                    const meas = log.period.measurement;
                    measurementValue = typeof meas === 'object' && meas._ !== undefined ? meas._ : meas;
                } else if (log.measurement) {
                    const meas = log.measurement;
                    measurementValue = typeof meas === 'object' && meas._ !== undefined ? meas._ : meas;
                } else {
                    continue;
                }

                const value = parseFloat(measurementValue);
                if (isNaN(value)) continue;

                // Construct the sensor key
                let key = log.type;
                
                // Handle specific P1 mappings and suffixes
                if (suffix) {
                    key = `${key}${suffix}`;
                }

                // Map to SmileSensors keys
                // We cast to any because we're dynamically assigning keys that match the interface
                (entity.sensors as any)[key] = value;
            }
        };

        // Process point logs (instantaneous values)
        if (source.logs.point_log) {
            const logs = Array.isArray(source.logs.point_log) ? source.logs.point_log : [source.logs.point_log];
            processLogs(logs);
        }

        // Process cumulative logs (total counters)
        if (source.logs.cumulative_log) {
            const logs = Array.isArray(source.logs.cumulative_log) ? source.logs.cumulative_log : [source.logs.cumulative_log];
            processLogs(logs, '_cumulative');
        }

        // Process interval logs (usage over time)
        if (source.logs.interval_log) {
            const logs = Array.isArray(source.logs.interval_log) ? source.logs.interval_log : [source.logs.interval_log];
            processLogs(logs, '_interval');
        }
    }

    /**
     * Parse actuators (switches, thermostats) from appliance
     */
    private parseActuators(source: any, entity: GatewayEntity): void {
        if (!source.actuator_functionalities) return;
        if (!entity.switches) entity.switches = {};

        const funcs = source.actuator_functionalities;

        // Parse relay/switch functionalities
        if (funcs.relay_functionality) {
            const relays = Array.isArray(funcs.relay_functionality) ? funcs.relay_functionality : [funcs.relay_functionality];
            for (const relay of relays) {
                if (relay.state !== undefined) {
                    // Use relay as the primary switch name
                    (entity.switches as any).relay = relay.state === 'on';
                    break; // Only use the first relay
                }
            }
        }

        // Parse thermostat functionalities
        if (funcs.thermostat_functionality) {
            const thermostats = Array.isArray(funcs.thermostat_functionality) ? funcs.thermostat_functionality : [funcs.thermostat_functionality];
            for (const thermostat of thermostats) {
                if (!entity.thermostat) entity.thermostat = {};

                if (thermostat.setpoint) {
                    entity.thermostat.setpoint = parseFloat(thermostat.setpoint);
                }
                if (thermostat.lower_bound) {
                    entity.thermostat.lower_bound = parseFloat(thermostat.lower_bound);
                }
                if (thermostat.upper_bound) {
                    entity.thermostat.upper_bound = parseFloat(thermostat.upper_bound);
                }
                if (thermostat.resolution) {
                    entity.thermostat.resolution = parseFloat(thermostat.resolution);
                }
            }
        }

        // Parse temperature offset functionalities
        if (funcs.temperature_offset_functionality) {
            const offsets = Array.isArray(funcs.temperature_offset_functionality) ? funcs.temperature_offset_functionality : [funcs.temperature_offset_functionality];
            for (const offset of offsets) {
                if (!entity.temperature_offset) entity.temperature_offset = {};

                if (offset.offset) {
                    entity.temperature_offset.setpoint = parseFloat(offset.offset);
                }
                if (offset.lower_bound) {
                    entity.temperature_offset.lower_bound = parseFloat(offset.lower_bound);
                }
                if (offset.upper_bound) {
                    entity.temperature_offset.upper_bound = parseFloat(offset.upper_bound);
                }
                if (offset.resolution) {
                    entity.temperature_offset.resolution = parseFloat(offset.resolution);
                }
            }
        }
    }

    /**
     * Set temperature on a thermostat
     */
    async setTemperature(params: SetTemperatureParams): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        const { location_id, setpoint, setpoint_high, setpoint_low } = params;

        let temperature: number;
        if (setpoint !== undefined) {
            temperature = setpoint;
        } else if (setpoint_low !== undefined) {
            temperature = setpoint_low;
        } else if (setpoint_high !== undefined) {
            temperature = setpoint_high;
        } else {
            throw new PlugwiseError('No temperature setpoint provided');
        }

        const data = `<thermostat_functionality><setpoint>${temperature}</setpoint></thermostat_functionality>`;

        // Find the thermostat URI for the location
        // This is a simplified version - the actual implementation would need to
        // query the domain objects to find the correct thermostat ID
        const uri = `/core/locations;id=${location_id}/thermostat`;

        await this.request(uri, 'PUT', data);
    }

    /**
     * Set temperature offset (calibration) on a thermostat
     */
    async setTemperatureOffset(deviceId: string, offset: number): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        const offsetValue = offset.toString();
        const data = `<offset_functionality><offset>${offsetValue}</offset></offset_functionality>`;
        const uri = `/core/appliances;id=${deviceId}/offset;type=temperature_offset`;

        await this.request(uri, 'PUT', data);
    }

    /**
     * Set preset on a thermostat
     */
    async setPreset(locationId: string, preset: string): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        // Get current location data
        const xml = await this.request('/core/domain_objects');
        const data = await this.parseXml(xml);

        const locations = this.getXmlValue(data, 'domain_objects.location');
        const locationArray = Array.isArray(locations) ? locations : [locations];
        const location = locationArray.find((loc: any) => loc.id === locationId);

        if (!location) {
            throw new PlugwiseError(`Location ${locationId} not found`);
        }

        const locationName = location.name || 'Unknown';
        const locationType = location.type || 'room';

        const xmlData = `<locations><location id="${locationId}"><name>${locationName}</name><type>${locationType}</type><preset>${preset}</preset></location></locations>`;

        await this.request(`/core/locations;id=${locationId}`, 'PUT', xmlData);
    }

    /**
     * Set schedule state (on/off)
     */
    async setScheduleState(locationId: string, state: 'on' | 'off', scheduleName?: string): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        // This is a complex operation that requires finding the schedule rule ID
        // For now, this is a placeholder implementation
        throw new PlugwiseError('setScheduleState not yet fully implemented');
    }

    /**
     * Control a switch (relay, lock, etc.)
     */
    async setSwitchState(params: SetSwitchParams): Promise<boolean> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        const { appliance_id, state, model = 'relay' } = params;
        const stateValue = state === 'on' ? 'on' : 'off';

        const data = `<relay_functionality><state>${stateValue}</state></relay_functionality>`;

        // Find the relay URI for the appliance
        // This is simplified - actual implementation would need to query for the relay ID
        const uri = `/core/appliances;id=${appliance_id}/relay`;

        await this.request(uri, 'PUT', data);

        return state === 'on';
    }

    /**
     * Set gateway mode (home, away, vacation)
     */
    async setGatewayMode(mode: GatewayMode): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        const validModes: GatewayMode[] = ['home', 'away', 'vacation'];
        if (!validModes.includes(mode)) {
            throw new PlugwiseError(`Invalid gateway mode: ${mode}`);
        }

        let valid = '';
        const endTime = '2037-04-21T08:00:53.000Z';

        if (mode === 'away' || mode === 'vacation') {
            const now = new Date().toISOString();
            valid = `<valid_from>${now}</valid_from><valid_to>${endTime}</valid_to>`;
        }

        const data = `<gateway_mode_control_functionality><mode>${mode}</mode>${valid}</gateway_mode_control_functionality>`;
        const uri = `/core/appliances;id=${this.gatewayId}/gateway_mode_control`;

        await this.request(uri, 'PUT', data);
    }

    /**
     * Set DHW (Domestic Hot Water) mode
     */
    async setDHWMode(mode: DHWMode): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        const data = `<domestic_hot_water_mode_control_functionality><mode>${mode}</mode></domestic_hot_water_mode_control_functionality>`;
        const uri = `/core/appliances;type=heater_central/domestic_hot_water_mode_control`;

        await this.request(uri, 'PUT', data);
    }

    /**
     * Set regulation mode
     */
    async setRegulationMode(mode: RegulationMode): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        let duration = '';
        if (mode.includes('bleeding')) {
            duration = '<duration>300</duration>';
        }

        const data = `<regulation_mode_control_functionality>${duration}<mode>${mode}</mode></regulation_mode_control_functionality>`;
        const uri = `/core/appliances;type=gateway/regulation_mode_control`;

        await this.request(uri, 'PUT', data);
    }

    /**
     * Delete active notification
     */
    async deleteNotification(): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        await this.request('/core/notifications', 'DELETE');
    }

    /**
     * Reboot the gateway
     */
    async rebootGateway(): Promise<void> {
        if (!this.connected) {
            throw new PlugwiseError('Not connected. Call connect() first.');
        }

        await this.request('/core/gateways;@reboot', 'POST');
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Get gateway ID
     */
    getGatewayId(): string {
        return this.gatewayId;
    }

    /**
     * Get heater ID
     */
    getHeaterId(): string {
        return this.heaterId;
    }

    /**
     * Get gateway info
     */
    getGatewayInfo(): GatewayInfo | null {
        return this.gatewayInfo;
    }
}
