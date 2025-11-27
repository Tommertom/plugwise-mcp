/**
 * Device Storage Service
 * Manages storage and retrieval of Plugwise device information
 */

import { GatewayEntity } from '../types/plugwise-types.js';
import { JsonStorageService } from './storage.service.js';

export interface StoredDevice {
    id: string;
    name: string;
    type: string;
    dev_class?: string;
    hubName: string;
    location?: string;
    model?: string;
    available?: boolean;
    capabilities?: {
        hasTemperature?: boolean;
        hasSwitch?: boolean;
        hasPresets?: boolean;
        hasSensors?: boolean;
    };
}

interface DeviceFileData {
    hubName: string;
    deviceId: string;
    password?: string;
    device: StoredDevice;
}

/**
 * Device Storage Service
 * Handles saving and loading device configurations from disk
 */
export class DeviceStorageService {
    private storage: JsonStorageService<DeviceFileData>;
    private devices: Map<string, StoredDevice> = new Map();

    constructor() {
        this.storage = new JsonStorageService<DeviceFileData>('devices');
    }

    /**
     * Extract relevant device capabilities from a GatewayEntity
     */
    private extractCapabilities(entity: GatewayEntity): StoredDevice['capabilities'] {
        return {
            hasTemperature: !!(entity.thermostat || entity.sensors?.temperature !== undefined),
            hasSwitch: !!(entity.switches && Object.keys(entity.switches).length > 0),
            hasPresets: !!(entity.preset_modes && entity.preset_modes.length > 0),
            hasSensors: !!(entity.sensors && Object.keys(entity.sensors).length > 0)
        };
    }

    /**
     * Convert GatewayEntity to StoredDevice format
     */
    private convertToStoredDevice(id: string, entity: GatewayEntity, hubName: string): StoredDevice {
        return {
            id,
            name: entity.name,
            type: entity.dev_class || 'unknown',
            dev_class: entity.dev_class,
            hubName,
            location: entity.location,
            model: entity.model,
            available: entity.available,
            capabilities: this.extractCapabilities(entity)
        };
    }

    /**
     * Save devices for a specific hub
     */
    async saveDevices(hubName: string, entities: Record<string, GatewayEntity>, password?: string): Promise<void> {
        const devices: StoredDevice[] = Object.entries(entities).map(([id, entity]) =>
            this.convertToStoredDevice(id, entity, hubName)
        );

        let savedCount = 0;
        for (const device of devices) {
            const fileName = `${hubName}_${device.id}`;
            const deviceData: DeviceFileData = {
                hubName,
                deviceId: device.id,
                password,
                device
            };

            try {
                await this.storage.save(fileName, deviceData);
                this.devices.set(device.id, device);
                savedCount++;
            } catch (error) {
                console.error(`Failed to save device ${device.id}:`, error);
            }
        }

        console.error(`✓ Saved ${savedCount} devices for hub ${hubName}`);
    }

    /**
     * Load all devices from storage
     */
    async loadAllDevices(): Promise<void> {
        try {
            const allDevices = await this.storage.loadAll();
            
            for (const [_, deviceData] of allDevices) {
                if (deviceData.device) {
                    this.devices.set(deviceData.deviceId, deviceData.device);
                }
            }

            console.error(`✓ Loaded ${this.devices.size} devices from storage`);
        } catch (error) {
            console.error('Error loading devices:', error);
        }
    }

    /**
     * Get all loaded devices
     */
    getDevices(): Map<string, StoredDevice> {
        return this.devices;
    }

    /**
     * Get devices for a specific hub
     */
    getDevicesByHub(hubName: string): StoredDevice[] {
        return Array.from(this.devices.values()).filter(d => d.hubName === hubName);
    }

    /**
     * Get a specific device by ID
     */
    getDevice(deviceId: string): StoredDevice | undefined {
        return this.devices.get(deviceId);
    }
}
