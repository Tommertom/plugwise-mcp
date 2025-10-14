#!/bin/bash

##
# Find Plugwise Hub on Local Network
#
# This script scans the local network to find Plugwise gateways.
# It tries to authenticate with credentials from the .env file.
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Plugwise Hub Finder${NC}"
echo "================================"

# Load credentials from .env file
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    echo -e "${GREEN}✓${NC} Loaded credentials from .env"
else
    echo -e "${RED}✗${NC} .env file not found"
    exit 1
fi

# Check if we have credentials
if [ -z "$HUB1" ] && [ -z "$HUB2" ] && [ -z "$PLUGWISE_PASSWORD" ]; then
    echo -e "${RED}✗${NC} No hub credentials found in .env"
    echo "    Add HUB1=your_password or HUB2=your_password to .env"
    exit 1
fi

# Use HUB1, HUB2, or PLUGWISE_PASSWORD
PASSWORD="${PLUGWISE_PASSWORD:-${HUB1:-$HUB2}}"
USERNAME="${PLUGWISE_USERNAME:-smile}"

echo -e "${BLUE}Password:${NC} ${PASSWORD:0:2}******"
echo ""

# Detect local network range
echo -e "${YELLOW}⚙${NC}  Detecting local network..."
GATEWAY=$(ip route | grep default | awk '{print $3}')
if [ -z "$GATEWAY" ]; then
    echo -e "${RED}✗${NC} Could not detect default gateway"
    exit 1
fi

# Extract network prefix (e.g., 192.168.1)
NETWORK_PREFIX=$(echo $GATEWAY | cut -d. -f1-3)
echo -e "${GREEN}✓${NC} Network: ${NETWORK_PREFIX}.0/24"
echo ""

echo -e "${YELLOW}🔎${NC} Scanning ${NETWORK_PREFIX}.1-254 for Plugwise hubs..."
echo "    This may take a few minutes..."
echo ""

FOUND_COUNT=0

# Scan the network
for i in {1..254}; do
    IP="${NETWORK_PREFIX}.${i}"
    
    # Show progress every 50 IPs
    if [ $((i % 50)) -eq 0 ]; then
        echo -e "${BLUE}   ${NC} Scanning ${IP}..."
    fi
    
    # Try to connect with a short timeout
    # Use curl to test HTTP Basic Auth
    RESPONSE=$(timeout 0.3 curl -s -f -u "${USERNAME}:${PASSWORD}" "http://${IP}:80/core/domain_objects" 2>/dev/null || echo "")
    
    if [ -n "$RESPONSE" ]; then
        # Check if it's actually a Plugwise device by looking for XML markers
        if echo "$RESPONSE" | grep -q "domain_objects\|gateway\|appliance"; then
            FOUND_COUNT=$((FOUND_COUNT + 1))
            echo ""
            echo -e "${GREEN}✓ FOUND PLUGWISE HUB!${NC}"
            echo -e "  ${BLUE}IP Address:${NC} ${IP}"
            
            # Try to extract gateway info
            if echo "$RESPONSE" | grep -q "name"; then
                NAME=$(echo "$RESPONSE" | grep -oP '(?<=<name>)[^<]+' | head -1)
                echo -e "  ${BLUE}Name:${NC} ${NAME}"
            fi
            
            if echo "$RESPONSE" | grep -q "vendor_model"; then
                MODEL=$(echo "$RESPONSE" | grep -oP '(?<=<vendor_model>)[^<]+' | head -1)
                echo -e "  ${BLUE}Model:${NC} ${MODEL}"
            fi
            
            if echo "$RESPONSE" | grep -q "firmware_version"; then
                VERSION=$(echo "$RESPONSE" | grep -oP '(?<=<firmware_version>)[^<]+' | head -1)
                echo -e "  ${BLUE}Firmware:${NC} ${VERSION}"
            fi
            
            echo ""
            echo -e "${YELLOW}To use this hub, run:${NC}"
            echo -e "  export PLUGWISE_HOST=${IP}"
            echo -e "  node scripts/test-mcp-server.js"
            echo ""
            echo -e "${YELLOW}Or add to your .env file:${NC}"
            echo -e "  PLUGWISE_HOST=${IP}"
            echo ""
        fi
    fi
done

echo ""
echo "================================"

if [ $FOUND_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠${NC}  No Plugwise hubs found on ${NETWORK_PREFIX}.0/24"
    echo ""
    echo "Troubleshooting tips:"
    echo "  1. Ensure the hub is powered on and connected to the network"
    echo "  2. Check if the hub is on a different subnet"
    echo "  3. Verify the password in .env matches the hub (${PASSWORD:0:2}******)"
    echo "  4. Try accessing the hub's web interface manually"
    echo ""
    echo "You can also try scanning a different network:"
    echo "  NETWORK_PREFIX=192.168.0 $0"
else
    echo -e "${GREEN}✓${NC} Found ${FOUND_COUNT} Plugwise hub(s)"
fi

echo ""
