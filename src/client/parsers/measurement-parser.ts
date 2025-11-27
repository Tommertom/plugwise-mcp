/**
 * Measurement Parser
 * Parses sensor measurements from XML data
 */

import { GatewayEntity } from '../../types/plugwise-types.js';
import { ensureArray, extractMeasurement } from '../../utils/xml-helpers.js';

export class MeasurementParser {
    /**
     * Parse measurements from appliance/location logs
     */
    parseMeasurements(source: any, entity: GatewayEntity): void {
        if (!source.logs) return;
        if (!entity.sensors) entity.sensors = {};

        // Process point logs (instantaneous values)
        if (source.logs.point_log) {
            const logs = ensureArray(source.logs.point_log);
            this.processLogs(logs, entity, '');
        }

        // Process cumulative logs (total counters)
        if (source.logs.cumulative_log) {
            const logs = ensureArray(source.logs.cumulative_log);
            this.processLogs(logs, entity, '_cumulative');
        }

        // Process interval logs (usage over time)
        if (source.logs.interval_log) {
            const logs = ensureArray(source.logs.interval_log);
            this.processLogs(logs, entity, '_interval');
        }
    }

    /**
     * Process a list of logs
     */
    private processLogs(logs: any[], entity: GatewayEntity, suffix: string): void {
        for (const log of logs) {
            if (!log.type) continue;

            const value = extractMeasurement(log);
            if (value === undefined) continue;

            // Construct the sensor key
            const key = suffix ? `${log.type}${suffix}` : log.type;
            
            // Store the measurement
            (entity.sensors as any)[key] = value;
        }
    }
}
