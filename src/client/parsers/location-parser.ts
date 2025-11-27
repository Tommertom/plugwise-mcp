/**
 * Location Parser
 * Parses location (zone/room) data into GatewayEntity
 */

import { GatewayEntity } from '../../types/plugwise-types.js';
import { MeasurementParser } from './measurement-parser.js';

export class LocationParser {
    private measurementParser: MeasurementParser;

    constructor() {
        this.measurementParser = new MeasurementParser();
    }

    /**
     * Parse location data into GatewayEntity
     */
    parseLocation(location: any): GatewayEntity | null {
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
            this.measurementParser.parseMeasurements(location, entity);

            return entity;
        } catch (error) {
            console.error('Failed to parse location:', error);
            return null;
        }
    }
}
