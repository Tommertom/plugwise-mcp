/**
 * Hub Discovery Service
 * Manages discovery and storage of Plugwise hubs
 */

import { execSync } from 'child_process';
import { PlugwiseClient } from '../client/plugwise-client.js';
import { loadHubCredentials, HubCredentials } from '../config/environment.js';
import { JsonStorageService } from './storage.service.js';

export interface DiscoveredHub {
    name: string;
    ip: string;
    password: string;
    model?: string;
    firmware?: string;
    discoveredAt: Date;
}

interface HubFileData {
    name: string;
    ip: string;
    password: string;
    model?: string;
    firmware?: string;
    discoveredAt: string;
}

/**
 * Hub Discovery Service
 * Maintains a registry of discovered hubs and provides discovery functionality
 */
export class HubDiscoveryService {
    private discoveredHubs: Map<string, DiscoveredHub> = new Map();
    private storage: JsonStorageService<HubFileData>;

    constructor() {
        this.storage = new JsonStorageService<HubFileData>('hubs');
    }

    /**
     * Get all discovered hubs
     */
    getDiscoveredHubs(): DiscoveredHub[] {
        return Array.from(this.discoveredHubs.values());
    }

    /**
     * Get a hub by IP address
     */
    getHub(ip: string): DiscoveredHub | undefined {
        return this.discoveredHubs.get(ip);
    }

    /**
     * Add or update a hub in the registry
     */
    addHub(hub: DiscoveredHub): void {
        this.discoveredHubs.set(hub.ip, hub);
    }

    /**
     * Save a hub to storage
     */
    private async saveHubToFile(hubName: string, hub: DiscoveredHub): Promise<void> {
        try {
            const hubData: HubFileData = {
                name: hub.name,
                ip: hub.ip,
                password: hub.password,
                model: hub.model,
                firmware: hub.firmware,
                discoveredAt: hub.discoveredAt.toISOString()
            };
            await this.storage.save(hubName, hubData);
            console.error(`✓ Hub saved: ${hubName}`);
        } catch (error) {
            console.error('Error saving hub to file:', error);
            throw new Error(`Failed to save hub: ${(error as Error).message}`);
        }
    }

    /**
     * Load a hub from storage
     */
    private async loadHubFromFile(hubName: string): Promise<DiscoveredHub | null> {
        try {
            const hubData = await this.storage.load(hubName);
            if (!hubData) return null;
            
            return {
                name: hubData.name,
                ip: hubData.ip,
                password: hubData.password,
                model: hubData.model,
                firmware: hubData.firmware,
                discoveredAt: new Date(hubData.discoveredAt)
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Load all hubs from storage
     */
    async loadAllHubsFromFiles(): Promise<void> {
        try {
            const allHubs = await this.storage.loadAll();

            for (const [hubName, hubData] of allHubs) {
                const hub: DiscoveredHub = {
                    name: hubData.name,
                    ip: hubData.ip,
                    password: hubData.password,
                    model: hubData.model,
                    firmware: hubData.firmware,
                    discoveredAt: new Date(hubData.discoveredAt)
                };
                this.addHub(hub);
                console.error(`✓ Loaded hub from file: ${hubName} at ${hub.ip}`);
            }
        } catch (error) {
            console.error('Error loading hubs from files:', error);
        }
    }

    /**
     * Verify a hub is still accessible at its IP, or find it on the network
     */
    async verifyHub(hub: DiscoveredHub): Promise<DiscoveredHub | null> {
        console.error(`\n🔍 Verifying hub: ${hub.name} (${hub.ip})`);

        // 1. Try to connect to existing IP
        try {
            const testClient = new PlugwiseClient({
                host: hub.ip,
                password: hub.password,
                username: 'smile'
            });

            // Short timeout for verification
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('timeout')), 2000)
            );

            const gatewayInfo = await Promise.race([
                testClient.connect(),
                timeoutPromise
            ]);

            if (gatewayInfo) {
                console.error(`✅ Hub verified at ${hub.ip}`);
                // Update details if changed
                const updatedHub: DiscoveredHub = {
                    ...hub,
                    name: gatewayInfo.name || hub.name,
                    model: gatewayInfo.model || hub.model,
                    firmware: gatewayInfo.version || hub.firmware,
                    discoveredAt: new Date()
                };
                this.addHub(updatedHub);
                await this.saveHubToFile(hub.name, updatedHub);
                return updatedHub;
            }
        } catch (error) {
            console.error(`⚠️  Hub not reachable at ${hub.ip}: ${(error as Error).message}`);
        }

        // 2. If not found, scan network
        console.error(`🔄 Scanning network for hub with password/ID: ${hub.password}`);
        const networkToScan = this.detectLocalNetwork();
        const foundHub = await this.scanForHub(networkToScan, hub.password, hub.name);

        if (foundHub) {
            console.error(`✅ Hub relocated at ${foundHub.ip}`);
            // Preserve original name if the scan didn't find a better one or if we want to keep the file name
            const updatedHub = {
                ...foundHub,
                name: hub.name // Keep the original name/ID used for the file
            };
            this.addHub(updatedHub);
            await this.saveHubToFile(hub.name, updatedHub);
            return updatedHub;
        }

        console.error(`❌ Hub ${hub.name} could not be found on the network`);
        return null;
    }

    /**
     * Add a hub by scanning the network with a specific hub name/password
     */
    async addHubByName(hubName: string): Promise<{
        success: boolean;
        hub?: DiscoveredHub;
        error?: string;
    }> {
        try {
            console.error(`\n${'='.repeat(80)}`);
            console.error(`🔍 ADD HUB: ${hubName}`);
            console.error(`${'='.repeat(80)}\n`);

            // First, check if we already have this hub in a file
            console.error(`📁 Checking for saved hub configuration...`);
            const existingHub = await this.loadHubFromFile(hubName);
            if (existingHub) {
                console.error(`✓ Found saved hub at ${existingHub.ip}`)
                // Use verifyHub logic
                const verifiedHub = await this.verifyHub(existingHub);
                if (verifiedHub) {
                    return { success: true, hub: verifiedHub };
                }
                // If verifyHub failed, it already tried scanning.
                // But maybe we want to try scanning with hubName as password if existingHub had a different password?
                // Assuming existingHub.password is correct (which should be hubName usually).
            } else {
                console.error(`ℹ️  No saved configuration found\n`);
            }

            // Scan the network to find the hub
            const networkToScan = this.detectLocalNetwork();
            console.error(`📡 Network to scan: ${networkToScan}\n`);

            // Use hubName as password/ID
            const hub = await this.scanForHub(networkToScan, hubName, hubName);

            if (hub) {
                this.addHub(hub);
                await this.saveHubToFile(hubName, hub);
                console.error(`\n✅ Hub successfully added and saved!\n`);
                return { success: true, hub };
            } else {
                const errorMsg = `Hub "${hubName}" not found on network ${networkToScan}. Please ensure the hub is connected and the name is correct.`;
                console.error(`\n❌ ${errorMsg}\n`);
                return {
                    success: false,
                    error: errorMsg
                };
            }
        } catch (error) {
            const errorMsg = (error as Error).message;
            console.error(`\n❌ Error: ${errorMsg}\n`);
            return {
                success: false,
                error: errorMsg
            };
        }
    }

    /**
     * Scan network for a specific hub by password (ID)
     */
    private async scanForHub(
        network: string,
        password: string,
        knownName?: string
    ): Promise<DiscoveredHub | null> {
        const [baseIp] = network.split('/');
        const [octet1, octet2, octet3] = baseIp.split('.');
        const networkBase = `${octet1}.${octet2}.${octet3}`;

        console.error(`🔍 Starting network scan on ${networkBase}.1-254 for hub: ${knownName || password}`);
        console.error(`⏱️  Timeout per IP: 3 seconds`);
        console.error(`📊 Total IPs to scan: 254`);

        let foundHub: DiscoveredHub | null = null;
        let scannedCount = 0;
        let activeScans = 0;
        const startTime = Date.now();

        const scanPromises: Promise<DiscoveredHub | null>[] = [];

        for (let lastOctet = 1; lastOctet <= 254; lastOctet++) {
            const ip = `${networkBase}.${lastOctet}`;

            scanPromises.push(
                (async () => {
                    // Early exit if hub already found
                    if (foundHub) {
                        return null;
                    }

                    activeScans++;
                    try {
                        const testClient = new PlugwiseClient({
                            host: ip,
                            password: password,
                            username: 'smile'
                        });

                        // Increased timeout from 2s to 3s for better reliability
                        const timeoutPromise = new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('timeout')), 3000)
                        );

                        const gatewayInfo = await Promise.race([
                            testClient.connect(),
                            timeoutPromise
                        ]);

                        if (gatewayInfo) {
                            const hub: DiscoveredHub = {
                                name: gatewayInfo.name || knownName || 'Unknown',
                                ip,
                                password: password,
                                model: gatewayInfo.model,
                                firmware: gatewayInfo.version,
                                discoveredAt: new Date()
                            };

                            if (!foundHub) {
                                foundHub = hub;
                                const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                                console.error(`✅ SUCCESS! Found hub at ${ip}: ${hub.name} (${hub.model})`);
                                console.error(`   Firmware: ${hub.firmware}`);
                                console.error(`   Scan time: ${elapsed}s, IPs checked: ${scannedCount}`);
                            }
                            return hub;
                        }
                    } catch (error) {
                        // Log detailed errors for debugging
                        const errorMsg = (error as Error).message;
                        if (errorMsg !== 'timeout' && !errorMsg.includes('ECONNREFUSED') && !errorMsg.includes('ETIMEDOUT')) {
                            // console.error(`   ⚠️  ${ip}: ${errorMsg}`);
                        }
                    } finally {
                        activeScans--;
                        scannedCount++;

                        // Progress logging every 50 IPs
                        if (scannedCount % 50 === 0) {
                            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
                            console.error(`   📊 Progress: ${scannedCount}/254 IPs scanned (${elapsed}s elapsed, ${activeScans} active)`);
                        }
                    }
                    return null;
                })()
            );
        }

        // Wait for all scans to complete or hub to be found
        await Promise.all(scanPromises);

        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (foundHub) {
            console.error(`🎉 Scan completed successfully in ${totalElapsed}s`);
            return foundHub;
        } else {
            console.error(`❌ Scan completed - no hub found in ${totalElapsed}s`);
            console.error(`   Scanned ${scannedCount} IPs on network ${networkBase}.0/24`);
            return null;
        }
    }

    /**
     * Get the first discovered hub (useful for auto-connect)
     */
    getFirstHub(): DiscoveredHub | undefined {
        const hubs = Array.from(this.discoveredHubs.values());
        return hubs.length > 0 ? hubs[0] : undefined;
    }

    /**
     * Check if any hubs have been discovered
     */
    hasDiscoveredHubs(): boolean {
        return this.discoveredHubs.size > 0;
    }

    /**
     * Load HUB configurations from environment variables
     * Reads HUBx and HUBxIP variables and pre-populates discoveredHubs
     */
    async loadFromEnvironment(): Promise<void> {
        console.error('Loading HUB configurations from .env...');

        const credentials = loadHubCredentials();

        if (credentials.size === 0) {
            console.error('No HUBx/HUBxIP pairs found in .env file');
            return;
        }

        for (const [index, creds] of credentials.entries()) {
            if (creds.password && creds.ip) {
                try {
                    // Try to connect to get gateway info
                    const testClient = new PlugwiseClient({
                        host: creds.ip,
                        password: creds.password,
                        username: 'smile'
                    });

                    const gatewayInfo = await testClient.connect();

                    const hub: DiscoveredHub = {
                        name: gatewayInfo.name || `Hub ${index}`,
                        ip: creds.ip,
                        password: creds.password,
                        model: gatewayInfo.model,
                        firmware: gatewayInfo.version,
                        discoveredAt: new Date()
                    };

                    this.addHub(hub);
                    console.error(`✓ Loaded HUB${index} at ${creds.ip}: ${hub.name} (${hub.model})`);
                } catch (error) {
                    // If connection fails, still store the hub with basic info
                    const hub: DiscoveredHub = {
                        name: `Hub ${index}`,
                        ip: creds.ip,
                        password: creds.password,
                        discoveredAt: new Date()
                    };

                    this.addHub(hub);
                    console.error(`⚠ Loaded HUB${index} at ${creds.ip} (connection failed, stored credentials only)`);
                }
            }
        }

        console.error(`✓ Loaded ${this.discoveredHubs.size} hub(s) from .env`);
    }

    /**
     * Scan network for Plugwise hubs
     */
    async scanNetwork(network?: string): Promise<{
        discovered: DiscoveredHub[];
        scannedCount: number;
    }> {
        const hubConfigs = loadHubCredentials();

        if (hubConfigs.size === 0) {
            throw new Error('No HUBx passwords found in .env file. Please add HUB1, HUB2, etc.');
        }

        const discovered: DiscoveredHub[] = [];
        let scannedCount = 0;

        // Strategy 1: Test known IPs from HUBxIP variables
        const knownIPs = Array.from(hubConfigs.values())
            .filter(h => h.ip)
            .map(h => h.ip!);

        if (knownIPs.length > 0) {
            console.error(`Testing ${knownIPs.length} known hub IP(s)...`);

            for (const [index, config] of hubConfigs.entries()) {
                if (!config.ip) continue;

                scannedCount++;
                try {
                    const testClient = new PlugwiseClient({
                        host: config.ip,
                        password: config.password,
                        username: 'smile'
                    });

                    const gatewayInfo = await testClient.connect();

                    const hub: DiscoveredHub = {
                        name: gatewayInfo.name || 'Unknown',
                        ip: config.ip,
                        password: config.password,
                        model: gatewayInfo.model,
                        firmware: gatewayInfo.version,
                        discoveredAt: new Date()
                    };
                    discovered.push(hub);
                    this.addHub(hub);
                    console.error(`✓ Found hub at ${config.ip}: ${hub.name}`);
                } catch (error) {
                    console.error(`✗ No hub at ${config.ip}`);
                }
            }
        }

        // Strategy 2: Network scanning if requested or no known IPs
        const shouldScanNetwork = network || knownIPs.length === 0;

        if (shouldScanNetwork) {
            const networkToScan = network || this.detectLocalNetwork();
            console.error(`Scanning network ${networkToScan}...`);

            const scanResults = await this.scanNetworkRange(networkToScan, hubConfigs);
            discovered.push(...scanResults.discovered);
            scannedCount += scanResults.scannedCount;
        }

        return { discovered, scannedCount };
    }

    /**
     * Detect local network automatically
     */
    private detectLocalNetwork(): string {
        try {
            // Strategy 1: Try to get default route network
            const defaultRoute = execSync('ip route | grep default | head -1', { encoding: 'utf-8' });
            const srcMatch = defaultRoute.match(/src (\d+\.\d+\.\d+\.\d+)/);

            if (srcMatch) {
                const ip = srcMatch[1];
                const [octet1, octet2, octet3] = ip.split('.');
                const network = `${octet1}.${octet2}.${octet3}.0/24`;
                console.error(`📡 Detected network from default route: ${network}`);
                return network;
            }

            // Strategy 2: Try scope link (but skip VPN interfaces)
            const routeOutput = execSync('ip route | grep "scope link" | grep -v tun | grep -v tap | head -1', { encoding: 'utf-8' });
            const match = routeOutput.match(/(\d+\.\d+\.\d+\.\d+\/\d+)/);
            if (match) {
                console.error(`📡 Detected network from scope link: ${match[1]}`);
                return match[1];
            }
        } catch (error) {
            console.error(`⚠️  Network detection failed, using fallback: 192.168.1.0/24`);
        }
        return '192.168.1.0/24';
    }

    /**
     * Scan a network range for hubs
     */
    private async scanNetworkRange(
        network: string,
        credentials: Map<number, HubCredentials>
    ): Promise<{
        discovered: DiscoveredHub[];
        scannedCount: number;
    }> {
        const discovered: DiscoveredHub[] = [];
        let scannedCount = 0;

        // Extract network base
        const [baseIp] = network.split('/');
        const [octet1, octet2, octet3] = baseIp.split('.');
        const networkBase = `${octet1}.${octet2}.${octet3}`;

        const scanPromises: Promise<void>[] = [];
        const allPasswords = Array.from(credentials.values()).map(h => h.password);

        for (let lastOctet = 1; lastOctet <= 254; lastOctet++) {
            const ip = `${networkBase}.${lastOctet}`;

            // Skip already discovered IPs
            if (discovered.some(h => h.ip === ip)) {
                continue;
            }

            scannedCount++;

            // Test each password for this IP
            for (const password of allPasswords) {
                scanPromises.push(
                    (async () => {
                        try {
                            const testClient = new PlugwiseClient({
                                host: ip,
                                password,
                                username: 'smile'
                            });

                            // Set a short timeout for scanning
                            const timeoutPromise = new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('timeout')), 1500)
                            );

                            const gatewayInfo = await Promise.race([
                                testClient.connect(),
                                timeoutPromise
                            ]);

                            if (gatewayInfo) {
                                const hub: DiscoveredHub = {
                                    name: (gatewayInfo as any).name || 'Unknown',
                                    ip,
                                    password,
                                    model: (gatewayInfo as any).model,
                                    firmware: (gatewayInfo as any).version,
                                    discoveredAt: new Date()
                                };
                                discovered.push(hub);
                                this.addHub(hub);
                                console.error(`✓ Found hub at ${ip}: ${hub.name}`);
                            }
                        } catch (error) {
                            // Ignore connection failures during scan
                        }
                    })()
                );
            }
        }

        // Wait for all scans to complete
        await Promise.all(scanPromises);

        return { discovered, scannedCount };
    }
}
