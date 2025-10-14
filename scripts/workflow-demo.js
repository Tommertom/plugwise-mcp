#!/usr/bin/env node

/**
 * Complete workflow demonstration
 *
 * This script demonstrates the full workflow of:
 * 1. Scanning the network for hubs
 * 2. Connecting without providing credentials
 * 3. Managing multiple hubs
 */

import http from "http";
import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, "..", ".env") });

const SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3000/mcp";

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(responseData));
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function callTool(toolName, args = {}) {
  const request = {
    jsonrpc: "2.0",
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args,
    },
    id: Math.random().toString(36).substring(7),
  };

  return await httpPost(SERVER_URL, request);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     Plugwise MCP Server - Complete Workflow Demo        ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  try {
    // Step 1: Network Scanning
    console.log("📡 Step 1: Scanning network for Plugwise hubs...\n");
    const scanResult = await callTool("scan_network", {});

    if (scanResult.error) {
      console.error("❌ Scan failed:", scanResult.error.message);
      process.exit(1);
    }

    const scanData = scanResult.result.structuredContent;
    console.log(`✅ Scan complete!`);
    console.log(`   Found: ${scanData.discovered.length} hub(s)`);
    console.log(`   Scanned: ${scanData.scanned_ips} IP(s)\n`);

    if (scanData.discovered.length === 0) {
      console.log("⚠️  No hubs found. Please check:");
      console.log("   - .env file contains HUB1, HUB2, etc.");
      console.log("   - Gateways are powered on");
      console.log("   - You are on the same network\n");
      process.exit(0);
    }

    // Display discovered hubs
    console.log("🎯 Discovered Hubs:\n");
    scanData.discovered.forEach((hub, index) => {
      console.log(`   ${index + 1}. ${hub.name}`);
      console.log(`      IP: ${hub.ip}`);
      console.log(`      Model: ${hub.model}`);
      console.log(`      Firmware: ${hub.firmware}`);
      console.log();
    });

    // Step 2: Auto-connect to first hub
    console.log("🔌 Step 2: Auto-connecting (no credentials needed)...\n");
    const connectResult = await callTool("connect", {});

    if (connectResult.error) {
      console.error("❌ Connection failed:", connectResult.error.message);
      process.exit(1);
    }

    const connectData = connectResult.result.structuredContent;
    console.log(`✅ Connected!`);
    console.log(`   Gateway: ${connectData.gateway_info.name}`);
    console.log(`   Model: ${connectData.gateway_info.model}`);
    console.log(`   Version: ${connectData.gateway_info.version}\n`);

    // Step 3: Get devices from first hub
    console.log("📱 Step 3: Retrieving devices from first hub...\n");
    const devicesResult = await callTool("get_devices", {});

    if (devicesResult.error) {
      console.error("❌ Get devices failed:", devicesResult.error.message);
    } else {
      const devicesData = devicesResult.result.structuredContent;
      const entities = Object.values(devicesData.data);
      const devices = entities.filter((e) => e.type !== "zone");
      const zones = entities.filter((e) => e.type === "zone");

      console.log(`✅ Retrieved ${entities.length} entities`);
      console.log(`   Devices: ${devices.length}`);
      console.log(`   Zones: ${zones.length}\n`);

      if (devices.length > 0) {
        console.log("   Sample Devices:");
        devices.slice(0, 5).forEach((device) => {
          console.log(
            `   - ${device.name} (${device.model || "unknown model"})`
          );
        });
        if (devices.length > 5) {
          console.log(`   ... and ${devices.length - 5} more\n`);
        } else {
          console.log();
        }
      }
    }

    // Step 4: Switch to second hub if available
    if (scanData.discovered.length > 1) {
      const hub2 = scanData.discovered[1];
      console.log(`🔄 Step 4: Switching to second hub (${hub2.ip})...\n`);

      const connect2Result = await callTool("connect", { host: hub2.ip });

      if (connect2Result.error) {
        console.error("❌ Connection failed:", connect2Result.error.message);
      } else {
        const connect2Data = connect2Result.result.structuredContent;
        console.log(`✅ Connected to second hub!`);
        console.log(`   Gateway: ${connect2Data.gateway_info.name}`);
        console.log(`   Model: ${connect2Data.gateway_info.model}`);
        console.log(`   Version: ${connect2Data.gateway_info.version}\n`);

        // Get devices from second hub
        const devices2Result = await callTool("get_devices", {});
        if (!devices2Result.error) {
          const devices2Data = devices2Result.result.structuredContent;
          const entities2 = Object.values(devices2Data.data);
          console.log(
            `✅ Retrieved ${entities2.length} entities from second hub\n`
          );
        }
      }
    }

    // Summary
    console.log("╔══════════════════════════════════════════════════════════╗");
    console.log("║                    Workflow Complete!                    ║");
    console.log(
      "╚══════════════════════════════════════════════════════════╝\n"
    );
    console.log("✅ Key Features Demonstrated:");
    console.log("   ✓ Network scanning with .env passwords");
    console.log("   ✓ Auto-connection without credentials");
    console.log("   ✓ Device discovery and listing");
    if (scanData.discovered.length > 1) {
      console.log("   ✓ Multi-hub management");
    }
    console.log("\n💡 Next Steps:");
    console.log("   - Use set_temperature to control thermostats");
    console.log("   - Use control_switch to control smart plugs");
    console.log("   - Use set_preset to change heating modes");
    console.log("   - Check docs/plugwise-mcp-server.md for more info\n");
  } catch (error) {
    console.error("\n❌ Workflow failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Make sure the MCP server is running:");
      console.error("   npm run build && npm start");
    }
    process.exit(1);
  }
}

main();
