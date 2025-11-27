/**
 * Appliance Parser
 * Parses appliance (device) data into GatewayEntity
 */

import { GatewayEntity } from '../../types/plugwise-types.js';
import { MeasurementParser } from './measurement-parser.js';
import { ActuatorParser } from './actuator-parser.js';

export class ApplianceParser {
    private measurementParser: MeasurementParser;
    private actuatorParser: ActuatorParser;

    constructor() {
        this.measurementParser = new MeasurementParser();
        this.actuatorParser = new ActuatorParser();
    }

    /**
     * Parse appliance data into GatewayEntity
     */
    parseAppliance(appliance: any): GatewayEntity | null {
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
            this.measurementParser.parseMeasurements(appliance, entity);

            // Parse actuators (switches, thermostats)
            this.actuatorParser.parseActuators(appliance, entity);

            return entity;
        } catch (error) {
            console.error('Failed to parse appliance:', error);
            return null;
        }
    }
}
