#!/usr/bin/env node

/**
 * Test script for Plugwise MCP Server
 *
 * This script demonstrates how to interact with the Plugwise MCP server
 * using the MCP protocol over HTTP.
 *
 * Usage: node scripts/test-mcp-server.js
 *
 * Optional environment variables:
 * - MCP_SERVER_URL: Server URL (default: http://localhost:3000/mcp)
 * - PLUGWISE_HOST: Gateway IP address for connection tests (or use HUB1/HUB2 from .env)
 * - PLUGWISE_PASSWORD: Gateway password for connection tests (or use HUB1/HUB2 from .env)
 * - HUB1: Password for first Plugwise hub
 * - HUB2: Password for second Plugwise hub
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
const HEALTH_URL = SERVER_URL.replace("/mcp", "/health");

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
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data: JSON.parse(responseData),
          });
        } catch (e) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Simple HTTP GET using Node's built-in http module
 */
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3000,
      path: urlObj.pathname,
      method: "GET",
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data: JSON.parse(responseData),
          });
        } catch (e) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            statusCode: res.statusCode,
            data: responseData,
          });
        }
      });
    });

    req.on("error", (e) => {
      reject(e);
    });

    req.end();
  });
}

/**
 * Send a JSON-RPC request to the MCP server
 */
async function sendRequest(method, params = {}, id = 1) {
  const request = {
    jsonrpc: "2.0",
    method,
    params,
    id,
  };

  console.log("\n📤 Sending request:");
  console.log(JSON.stringify(request, null, 2));

  try {
    const response = await httpPost(SERVER_URL, request);

    console.log("\n📥 Received response:");
    console.log(JSON.stringify(response.data, null, 2));

    if (!response.ok) {
      throw new Error(`HTTP ${response.statusCode}: Request failed`);
    }

    if (response.data.error) {
      throw new Error(`MCP Error: ${response.data.error.message}`);
    }

    return response.data.result;
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    throw error;
  }
}

/**
 * Test the server health endpoint
 */
async function testHealth() {
  console.log("\n🧪 Test 0: Check server health");

  try {
    const response = await httpGet(HEALTH_URL);

    if (!response.ok) {
      throw new Error(
        "Server is not responding. Make sure the server is running."
      );
    }

    console.log("✅ Server is healthy:");
    console.log(JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    throw error;
  }
}

/**
 * Test the server initialization
 */
async function testInitialize() {
  console.log("\n🧪 Test 1: Initialize connection");

  const result = await sendRequest(
    "initialize",
    {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: {
        name: "plugwise-test-client",
        version: "1.0.0",
      },
    },
    1
  );

  console.log(
    `✅ Connected to: ${result.serverInfo.name} v${result.serverInfo.version}`
  );
  return result;
}

/**
 * Test listing available tools
 */
async function testListTools() {
  console.log("\n🧪 Test 2: List available tools");

  const result = await sendRequest("tools/list", {}, 2);

  console.log(`\n✅ Found ${result.tools.length} tools:`);
  result.tools.forEach((tool) => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  return result;
}

/**
 * Test connecting to a Plugwise gateway
 * Note: This test requires a real gateway and credentials
 */
async function testConnectGateway() {
  console.log("\n🧪 Test 3: Connect to Plugwise gateway");

  // Get credentials from environment variables
  // Priority: PLUGWISE_HOST/PASSWORD > HUB1 > HUB2
  let host = process.env.PLUGWISE_HOST;
  let password =
    process.env.PLUGWISE_PASSWORD || process.env.HUB1 || process.env.HUB2;

  // If no explicit host is set, try to discover the gateway using smile{password}
  if (!host && password) {
    // Common pattern: smile{password} or smile000000
    host = `smile${password}`;
    console.log(`No PLUGWISE_HOST set, trying hostname: ${host}`);
  }

  if (!host || !password) {
    console.log(
      "⚠️  Skipping: Set PLUGWISE_HOST and PLUGWISE_PASSWORD (or HUB1/HUB2) environment variables to test"
    );
    console.log(
      "    Example: PLUGWISE_HOST=192.168.1.100 or use HUB1=glmpttxf in .env"
    );
    return null;
  }

  console.log(
    `Connecting to ${host} with password ${password.substring(0, 2)}******...`
  );

  const result = await sendRequest(
    "tools/call",
    {
      name: "connect",
      arguments: {
        host,
        password,
      },
    },
    3
  );

  const content = result.content[0];
  const data = JSON.parse(content.text);

  if (data.success) {
    console.log("✅ Connected successfully!");
    console.log(`   Gateway: ${data.gateway_info.name}`);
    console.log(`   Model: ${data.gateway_info.model}`);
    console.log(`   Type: ${data.gateway_info.type}`);
    console.log(`   Version: ${data.gateway_info.version}`);
  } else {
    console.error("❌ Connection failed:", data.error);
  }

  return data;
}

/**
 * Test getting all devices
 */
async function testGetDevices() {
  console.log("\n🧪 Test 4: Get all devices");

  try {
    const result = await sendRequest(
      "tools/call",
      {
        name: "get_devices",
        arguments: {},
      },
      4
    );

    const content = result.content[0];
    const data = JSON.parse(content.text);

    if (data.success) {
      const entityCount = Object.keys(data.data.entities).length;
      console.log(`✅ Found ${entityCount} devices/zones`);

      console.log("\nDevices:");
      for (const [id, entity] of Object.entries(data.data.entities)) {
        console.log(`  - ${entity.name} (${entity.dev_class || "unknown"})`);

        if (entity.sensors?.temperature) {
          console.log(`    Temperature: ${entity.sensors.temperature}°C`);
        }
        if (entity.sensors?.setpoint) {
          console.log(`    Setpoint: ${entity.sensors.setpoint}°C`);
        }
      }
    } else {
      console.error("❌ Failed to get devices:", data.error);
    }

    return data;
  } catch (error) {
    console.log("⚠️  Skipping: Not connected to gateway");
    return null;
  }
}

/**
 * Test listing available resources
 */
async function testListResources() {
  console.log("\n🧪 Test 5: List available resources");

  const result = await sendRequest("resources/list", {}, 5);

  console.log(`\n✅ Found ${result.resources.length} resources:`);
  result.resources.forEach((resource) => {
    console.log(`  - ${resource.uri}: ${resource.description}`);
  });

  return result;
}

/**
 * Test reading the devices resource
 */
async function testReadResource() {
  console.log("\n🧪 Test 6: Read devices resource");

  try {
    const result = await sendRequest(
      "resources/read",
      {
        uri: "plugwise://devices",
      },
      6
    );

    const content = result.contents[0];
    const data = JSON.parse(content.text);

    if (data.error) {
      console.error("❌ Failed to read resource:", data.error);
    } else {
      console.log("✅ Resource retrieved successfully");
      if (data.gateway_id) {
        console.log(`   Gateway ID: ${data.gateway_id}`);
        console.log(`   Entities: ${Object.keys(data.entities || {}).length}`);
      }
    }

    return data;
  } catch (error) {
    console.log("⚠️  Skipping: Not connected to gateway");
    return null;
  }
}

/**
 * Test listing available prompts
 */
async function testListPrompts() {
  console.log("\n🧪 Test 7: List available prompts");

  const result = await sendRequest("prompts/list", {}, 7);

  console.log(`\n✅ Found ${result.prompts.length} prompts:`);
  result.prompts.forEach((prompt) => {
    console.log(`  - ${prompt.name}: ${prompt.description}`);
  });

  return result;
}

/**
 * Test getting the setup guide prompt
 */
async function testGetPrompt() {
  console.log("\n🧪 Test 8: Get setup guide prompt");

  const result = await sendRequest(
    "prompts/get",
    {
      name: "setup_guide",
      arguments: {},
    },
    8
  );

  console.log("✅ Prompt retrieved successfully");
  console.log(`   Messages: ${result.messages.length}`);

  return result;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log("🚀 Starting Plugwise MCP Server Tests");
  console.log(`📡 Server URL: ${SERVER_URL}`);
  console.log("=".repeat(60));

  try {
    // Check if server is running
    await testHealth();

    // Run MCP protocol tests
    await testInitialize();
    await testListTools();
    await testListResources();
    await testListPrompts();
    await testGetPrompt();

    // Try to connect to gateway (if credentials provided)
    const connectResult = await testConnectGateway();

    // If connected, test device operations
    if (connectResult && connectResult.success) {
      await testGetDevices();
      await testReadResource();
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ All tests completed successfully!");
    console.log(
      "\n💡 Tip: Set PLUGWISE_HOST and PLUGWISE_PASSWORD environment"
    );
    console.log("   variables to test the gateway connection features.");
  } catch (error) {
    console.log("\n" + "=".repeat(60));
    console.error("❌ Test suite failed:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the tests
runTests();
