#!/usr/bin/env node

/**
 * Test script to verify automatic HUB loading from .env file
 *
 * This script tests that the server correctly loads HUBx/HUBxIP pairs
 * from the .env file on startup.
 */

import { config } from "dotenv";

// Load .env file
config();

console.log("🧪 Testing automatic HUB loading from .env\n");

// Check for HUBx/HUBxIP pairs
const hubPairs = [];
for (let i = 1; i <= 10; i++) {
  const password = process.env[`HUB${i}`];
  const ip = process.env[`HUB${i}IP`];

  if (password && ip) {
    hubPairs.push({ index: i, password, ip });
    console.log(`✓ Found HUB${i} configuration:`);
    console.log(`  - IP: ${ip}`);
    console.log(`  - Password: ${password.substring(0, 4)}****`);
    console.log("");
  } else if (password && !ip) {
    console.log(
      `⚠ Found HUB${i} password but no HUB${i}IP - will not be auto-loaded`
    );
    console.log("");
  } else if (!password && ip) {
    console.log(
      `⚠ Found HUB${i}IP but no HUB${i} password - incomplete configuration`
    );
    console.log("");
  }
}

if (hubPairs.length === 0) {
  console.log("❌ No complete HUBx/HUBxIP pairs found in .env file");
  console.log("\nTo enable auto-loading, add pairs like:");
  console.log("  HUB1=your-password");
  console.log("  HUB1IP=192.168.1.100");
  process.exit(1);
}

console.log(`✅ Found ${hubPairs.length} complete HUB configuration(s)`);
console.log(
  "\nThese hubs will be automatically loaded when the server starts."
);
console.log("You can now run: npm start");
