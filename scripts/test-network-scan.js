#!/usr/bin/env node

/**
 * Test script for network scanning functionality
 *
 * This script tests the scan_network tool that discovers Plugwise hubs
 * using passwords from .env file (HUB1, HUB2, etc.)
 *
 * Usage: node scripts/test-network-scan.js
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

/**
 * Simple HTTP POST using Node's built-in http module
 */
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
          const jsonResponse = JSON.parse(responseData);
          resolve(jsonResponse);
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

/**
 * Call an MCP tool
 */
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

/**
 * Main test flow
 */
async function main() {
  console.log("🔍 Testing Plugwise Network Scanning\n");

  // Check .env variables
  console.log("📋 Environment Variables:");
  for (let i = 1; i <= 10; i++) {
    const hubVar = `HUB${i}`;
    const value = process.env[hubVar];
    if (value) {
      console.log(`  ✓ ${hubVar}: ${value}`);
    }
  }
  console.log();

  try {
    // Test 1: Scan Network
    console.log("🌐 Test 1: Scanning network for Plugwise hubs...");
    console.log("   (This may take a minute or two)");
    const scanResult = await callTool("scan_network", {});

    if (scanResult.error) {
      console.error("❌ Scan failed:", scanResult.error);
      process.exit(1);
    }

    const scanData = scanResult.result.structuredContent;
    console.log(`✅ Scan completed!`);
    console.log(`   Scanned: ${scanData.scanned_ips} IP addresses`);
    console.log(`   Found: ${scanData.discovered.length} hub(s)\n`);

    if (scanData.discovered.length > 0) {
      console.log("🎯 Discovered Hubs:");
      scanData.discovered.forEach((hub, index) => {
        console.log(`   Hub ${index + 1}:`);
        console.log(`     Name: ${hub.name}`);
        console.log(`     IP: ${hub.ip}`);
        console.log(`     Model: ${hub.model || "Unknown"}`);
        console.log(`     Firmware: ${hub.firmware || "Unknown"}`);
        console.log();
      });

      // Test 2: Connect without credentials (should use discovered hub)
      console.log(
        "🔌 Test 2: Connecting to first discovered hub (auto-credentials)..."
      );
      const connectResult = await callTool("connect", {});

      if (connectResult.error) {
        console.error("❌ Connection failed:", connectResult.error);
      } else {
        const connectData = connectResult.result.structuredContent;
        if (connectData.success) {
          console.log("✅ Connected successfully!");
          console.log(`   Gateway: ${connectData.gateway_info.name}`);
          console.log(`   Model: ${connectData.gateway_info.model}`);
          console.log(`   Version: ${connectData.gateway_info.version}\n`);

          // Test 3: Get devices
          console.log("📱 Test 3: Getting devices from connected hub...");
          const devicesResult = await callTool("get_devices", {});

          if (devicesResult.error) {
            console.error("❌ Get devices failed:", devicesResult.error);
          } else {
            const devicesData = devicesResult.result.structuredContent;
            if (devicesData.success) {
              const entityCount = Object.keys(devicesData.data).length;
              console.log(`✅ Retrieved ${entityCount} entities`);

              // Count device types
              const devices = Object.values(devicesData.data).filter(
                (e) => e.type !== "zone"
              );
              const zones = Object.values(devicesData.data).filter(
                (e) => e.type === "zone"
              );
              console.log(`   Devices: ${devices.length}`);
              console.log(`   Zones: ${zones.length}\n`);
            }
          }
        }
      }

      // Test 4: Connect to specific hub by IP
      if (scanData.discovered.length > 1) {
        console.log(
          "🔌 Test 4: Connecting to second hub by IP (auto-credentials)..."
        );
        const hub2 = scanData.discovered[1];
        const connect2Result = await callTool("connect", { host: hub2.ip });

        if (connect2Result.error) {
          console.error("❌ Connection failed:", connect2Result.error);
        } else {
          const connect2Data = connect2Result.result.structuredContent;
          if (connect2Data.success) {
            console.log("✅ Connected successfully!");
            console.log(`   Gateway: ${connect2Data.gateway_info.name}`);
            console.log(`   Model: ${connect2Data.gateway_info.model}\n`);
          }
        }
      }
    } else {
      console.log("⚠️  No hubs discovered. Make sure:");
      console.log(
        "   1. Your .env file contains HUB1, HUB2, etc. with correct passwords"
      );
      console.log(
        "   2. Plugwise hubs are powered on and connected to the network"
      );
      console.log("   3. You are on the same network as the hubs\n");
    }

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.code === "ECONNREFUSED") {
      console.error("\n💡 Make sure the MCP server is running:");
      console.error("   npm run build && node build/mcp/server.js");
    }
    process.exit(1);
  }
}

main();
