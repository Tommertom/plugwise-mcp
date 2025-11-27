/**
 * Actuator Parser
 * Parses actuator functionalities (switches, thermostats, etc.)
 */

import { GatewayEntity } from '../../types/plugwise-types.js';
import { ensureArray } from '../../utils/xml-helpers.js';

export class ActuatorParser {
    /**
     * Parse actuators (switches, thermostats) from appliance
     */
    parseActuators(source: any, entity: GatewayEntity): void {
        if (!source.actuator_functionalities) return;
        if (!entity.switches) entity.switches = {};

        const funcs = source.actuator_functionalities;

        this.parseRelays(funcs, entity);
        this.parseThermostats(funcs, entity);
        this.parseTemperatureOffsets(funcs, entity);
    }

    /**
     * Parse relay/switch functionalities
     */
    private parseRelays(funcs: any, entity: GatewayEntity): void {
        if (!funcs.relay_functionality) return;

        const relays = ensureArray(funcs.relay_functionality);
        for (const relay of relays) {
            if (relay.state !== undefined) {
                // Use relay as the primary switch name
                (entity.switches as any).relay = relay.state === 'on';
                break; // Only use the first relay
            }
        }
    }

    /**
     * Parse thermostat functionalities
     */
    private parseThermostats(funcs: any, entity: GatewayEntity): void {
        if (!funcs.thermostat_functionality) return;

        const thermostats = ensureArray(funcs.thermostat_functionality);
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

    /**
     * Parse temperature offset functionalities
     */
    private parseTemperatureOffsets(funcs: any, entity: GatewayEntity): void {
        if (!funcs.temperature_offset_functionality) return;

        const offsets = ensureArray(funcs.temperature_offset_functionality);
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
