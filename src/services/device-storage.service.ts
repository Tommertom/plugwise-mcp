/**
* Device Storage Service
* Manages storage and retrieval of Plugwise device information
*/

import { promises as fs } from 'fs';
import * as path from 'path';
import { GatewayEntity } from '../types/plugwise-types.js';

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

/**
 * Device Storage Service
 * Handles saving and loading device configurations from disk
 */
export class DeviceStorageService {
    private devicesDirectory: string;
    private devices: Map<string, StoredDevice> = new Map();

    constructor() {
        this.devicesDirectory = path.join(process.cwd(), 'mcp_data', 'plugwise', 'devices');
        this.ensureDevicesDirectory();
    }

    /**
     * Ensure the devices directory exists
     */
    private async ensureDevicesDirectory(): Promise<void> {
        try {
            await fs.mkdir(this.devicesDirectory, { recursive: true });
        } catch (error) {
            console.error('Error creating devices directory:', error);
        }
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
     * Each device is saved as a separate file: {hubName}_{deviceId}.json
     */
    async saveDevices(hubName: string, entities: Record<string, GatewayEntity>): Promise<void> {
        try {
            await this.ensureDevicesDirectory();

            const devices: StoredDevice[] = Object.entries(entities).map(([id, entity]) =>
                this.convertToStoredDevice(id, entity, hubName)
            );

            // Save each device as a separate file
            let savedCount = 0;
            for (const device of devices) {
                const fileName = `${hubName}_${device.id}.json`;
                const filePath = path.join(this.devicesDirectory, fileName);

                const deviceData = {
                    hubName,
                    deviceId: device.id,
                    humanReadableName: device.name,
                    updatedAt: new Date().toISOString(),
                    device
                };

                await fs.writeFile(filePath, JSON.stringify(deviceData, null, 2), 'utf-8');

                // Update in-memory cache
                this.devices.set(`${hubName}:${device.id}`, device);
                savedCount++;
            }

            console.log(`✓ Saved ${savedCount} device(s) for hub: ${hubName} (individual files)`);
        } catch (error) {
            console.error(`Error saving devices for hub ${hubName}:`, error);
            throw new Error(`Failed to save devices: ${(error as Error).message}`);
        }
    }

    /**
     * Load devices for a specific hub
     * Reads individual device files with pattern: {hubName}_{deviceId}.json
     */
    async loadDevicesForHub(hubName: string): Promise<StoredDevice[]> {
        try {
            await this.ensureDevicesDirectory();
            const files = await fs.readdir(this.devicesDirectory);
            const devices: StoredDevice[] = [];

            // Filter files that match the hubName pattern
            const hubFiles = files.filter(file =>
                file.startsWith(`${hubName}_`) && file.endsWith('.json')
            );

            for (const file of hubFiles) {
                try {
                    const filePath = path.join(this.devicesDirectory, file);
                    const content = await fs.readFile(filePath, 'utf-8');
                    const data = JSON.parse(content);

                    if (data.device) {
                        // Update in-memory cache
                        this.devices.set(`${hubName}:${data.device.id}`, data.device);
                        devices.push(data.device);
                    }
                } catch (error) {
                    console.error(`Error loading device file ${file}:`, error);
                    // Continue loading other devices
                }
            }

            return devices;
        } catch (error) {
            // Directory doesn't exist or can't be read
            return [];
        }
    }

    /**
     * Load all devices from all hub files
     * Reads individual device files with pattern: {hubName}_{deviceId}.json
     */
    async loadAllDevices(): Promise<Map<string, StoredDevice[]>> {
        const devicesByHub = new Map<string, StoredDevice[]>();

        try {
            await this.ensureDevicesDirectory();
            const files = await fs.readdir(this.devicesDirectory);

            // Group files by hub name
            const hubNames = new Set<string>();
            for (const file of files) {
                if (file.endsWith('.json')) {
                    // Extract hub name from filename pattern: {hubName}_{deviceId}.json
                    const parts = file.replace('.json', '').split('_');
                    if (parts.length >= 2) {
                        const hubName = parts[0];
                        hubNames.add(hubName);
                    }
                }
            }

            // Load devices for each hub
            for (const hubName of hubNames) {
                const devices = await this.loadDevicesForHub(hubName);
                if (devices.length > 0) {
                    devicesByHub.set(hubName, devices);
                    console.log(`✓ Loaded ${devices.length} device(s) for hub: ${hubName}`);
                }
            }
        } catch (error) {
            console.error('Error loading devices:', error);
        }

        return devicesByHub;
    }

    /**
     * Get all devices from memory
     */
    getAllDevices(): StoredDevice[] {
        return Array.from(this.devices.values());
    }

    /**
     * Get devices by hub name
     */
    getDevicesByHub(hubName: string): StoredDevice[] {
        return Array.from(this.devices.values()).filter(d => d.hubName === hubName);
    }

    /**
     * Find device by ID across all hubs
     */
    findDevice(deviceId: string): StoredDevice | undefined {
        // Try exact match first (hubName:deviceId)
        if (this.devices.has(deviceId)) {
            return this.devices.get(deviceId);
        }

        // Try to find by device ID without hub prefix
        for (const [key, device] of this.devices.entries()) {
            if (device.id === deviceId || key.endsWith(`:${deviceId}`)) {
                return device;
            }
        }

        return undefined;
    }

    /**
     * Get device count
     */
    getDeviceCount(): number {
        return this.devices.size;
    }

    /**
     * Clear all devices from memory
     */
    clear(): void {
        this.devices.clear();
    }
}
