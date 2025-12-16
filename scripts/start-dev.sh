#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 PM - Gestion de Projets - Startup Script${NC}\n"

# Check if MongoDB is installed
echo -e "${YELLOW}📋 Checking MongoDB installation...${NC}"
if command -v mongod &> /dev/null; then
    echo -e "${GREEN}✓ MongoDB found${NC}"
else
    echo -e "${RED}✗ MongoDB not found${NC}"
    echo -e "${YELLOW}Install MongoDB:${NC}"
    echo "  macOS:  brew install mongodb-community"
    echo "  Ubuntu: sudo apt-get install -y mongodb"
    echo "  Or download from: https://www.mongodb.com/try/download/community"
    exit 1
fi

# Create data directory if it doesn't exist
DATA_DIR="./data/db"
if [ ! -d "$DATA_DIR" ]; then
    echo -e "${YELLOW}📁 Creating MongoDB data directory...${NC}"
    mkdir -p "$DATA_DIR"
    echo -e "${GREEN}✓ Created $DATA_DIR${NC}"
fi

# Start MongoDB in background
echo -e "${YELLOW}🗄️  Starting MongoDB...${NC}"
mongod --dbpath "$DATA_DIR" --logpath ./data/mongodb.log --fork --logappend

sleep 2

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✓ MongoDB running on localhost:27017${NC}"
else
    echo -e "${RED}✗ Failed to start MongoDB${NC}"
    cat ./data/mongodb.log
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cat > .env << EOF
# MongoDB Connection (Local)
MONGO_URL=mongodb://localhost:27017/project-manager

# JWT Secret (REQUIRED - Change in production!)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-strong-secret-key-here

# Builder API (Optional)
NEXT_PUBLIC_BUILDER_API_KEY=

# Node Environment
NODE_ENV=development

# Next.js Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
    echo -e "${GREEN}✓ Created .env${NC}"
    echo -e "${YELLOW}⚠️  Remember to update JWT_SECRET in production!${NC}"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
fi

# Clean Next.js cache only if corrupted (check for lock files or incomplete builds)
if [ -d ".next" ]; then
    # Check for signs of corruption: lock files, empty cache, or incomplete build
    if [ -f ".next/.build-lock" ] || [ ! -f ".next/BUILD_ID" ] || [ -f ".next/cache/.corrupted" ]; then
        echo -e "${YELLOW}🧹 Cleaning corrupted Next.js cache...${NC}"
        rm -rf .next
    else
        echo -e "${GREEN}✓ Next.js cache intact${NC}"
    fi
fi

# Clean node_modules cache if needed
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
fi

# Cleanup function with proper Next.js shutdown
cleanup() {
    echo -e "\n${YELLOW}Shutting down gracefully...${NC}"

    # Kill Next.js process gracefully first
    if [ ! -z "$NEXT_PID" ]; then
        echo -e "${YELLOW}Stopping Next.js...${NC}"
        kill -TERM $NEXT_PID 2>/dev/null

        # Wait up to 5 seconds for graceful shutdown
        for i in {1..10}; do
            if ! kill -0 $NEXT_PID 2>/dev/null; then
                break
            fi
            sleep 0.5
        done

        # Force kill if still running
        if kill -0 $NEXT_PID 2>/dev/null; then
            echo -e "${RED}Force killing Next.js...${NC}"
            kill -9 $NEXT_PID 2>/dev/null
            # Mark cache as potentially corrupted
            touch .next/cache/.corrupted 2>/dev/null
        fi
    fi

    # Also kill any orphaned next processes
    pkill -f "next dev" 2>/dev/null

    echo -e "${YELLOW}Shutting down MongoDB...${NC}"
    pkill -f "mongod.*$DATA_DIR" 2>/dev/null

    echo -e "${GREEN}✓ Shutdown complete${NC}"
    exit 0
}

# Set trap before starting the app
trap cleanup EXIT INT TERM QUIT HUP

# Start the application
echo -e "${BLUE}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Everything ready!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}Starting application...${NC}"
echo -e "${BLUE}📱 App URL: http://localhost:3000${NC}"
echo -e "${BLUE}🗄️  MongoDB: mongodb://localhost:27017/project-manager${NC}\n"

# Start the application and capture PID
npm run dev &
NEXT_PID=$!

# Wait for the process
wait $NEXT_PID
