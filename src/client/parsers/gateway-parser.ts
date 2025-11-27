/**
 * Gateway Parser
 * Parses gateway information and detection
 */

import { GatewayInfo } from '../../types/plugwise-types.js';
import { getXmlValue } from '../../utils/xml-helpers.js';

export class GatewayParser {
    /**
     * Parse gateway information from domain objects
     */
    parseGatewayInfo(data: any): GatewayInfo | null {
        const gateway = getXmlValue(data, 'domain_objects.gateway');
        
        if (!gateway) {
            return null;
        }

        return {
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
    }

    /**
     * Detect the type of gateway (Adam, Anna, Smile P1, Stretch)
     */
    detectGatewayType(gateway: any): string {
        const model = gateway.vendor_model || '';
        const version = gateway.firmware_version || '';

        if (model.includes('159')) return 'thermostat'; // Adam
        if (model.includes('143')) return 'thermostat'; // Anna
        if (version.includes('smile_v')) return 'power'; // Smile P1
        if (version.includes('stretch_v')) return 'stretch'; // Stretch

        return 'unknown';
    }

    /**
     * Extract gateway and heater IDs from appliances
     */
    extractGatewayIds(data: any): { gatewayId: string; heaterId: string } {
        let gatewayId = '';
        let heaterId = '';

        const appliances = getXmlValue(data, 'domain_objects.appliance');
        if (appliances) {
            const applianceArray = Array.isArray(appliances) ? appliances : [appliances];
            for (const appliance of applianceArray) {
                const type = appliance.type;
                if (type === 'gateway') {
                    gatewayId = appliance.id;
                } else if (type === 'heater_central') {
                    heaterId = appliance.id;
                }
            }
        }

        return { gatewayId, heaterId };
    }
}
