#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default port
MONGODB_PORT=27017
FORCE_CLEANUP=false
USE_CUSTOM_PORT=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --force-cleanup)
            FORCE_CLEANUP=true
            shift
            ;;
        --port)
            MONGODB_PORT="$2"
            USE_CUSTOM_PORT=true
            shift 2
            ;;
        --help)
            echo -e "${BLUE}Usage:${NC}"
            echo "  ./start-dev-docker.sh [OPTIONS]"
            echo ""
            echo -e "${BLUE}Options:${NC}"
            echo "  --force-cleanup    Kill existing containers before starting"
            echo "  --port <port>      Use custom MongoDB port (default: 27017)"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${BLUE}🚀 PM - Gestion de Projets - Docker Startup Script${NC}\n"

# Check if Docker is installed
echo -e "${YELLOW}📋 Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker found${NC}"
else
    echo -e "${RED}✗ Docker not found${NC}"
    echo -e "${YELLOW}Install Docker from: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Check if Docker Compose is installed
echo -e "${YELLOW}📋 Checking Docker Compose installation...${NC}"
if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose v2 found${NC}"
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose v1 found (consider upgrading to v2)${NC}"
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    echo -e "${YELLOW}Install Docker Compose from: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

# Check if port is already in use
echo -e "${YELLOW}📋 Checking port availability...${NC}"
if lsof -Pi :${MONGODB_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Port ${MONGODB_PORT} is already in use${NC}"
    
    if [ "$FORCE_CLEANUP" = true ]; then
        echo -e "${YELLOW}🔄 Force cleanup enabled - stopping existing containers...${NC}"
        # Kill process on port
        PIDS=$(lsof -ti :${MONGODB_PORT})
        if [ ! -z "$PIDS" ]; then
            kill -9 $PIDS 2>/dev/null
            echo -e "${GREEN}✓ Killed process on port ${MONGODB_PORT}${NC}"
        fi
        # Also try to stop docker containers
        $COMPOSE_CMD down 2>/dev/null
        sleep 2
    elif [ "$USE_CUSTOM_PORT" = false ]; then
        echo -e "${YELLOW}Options:${NC}"
        echo -e "  1) Use --force-cleanup flag to kill existing process"
        echo -e "  2) Use --port <port> to use a different port"
        echo -e "  3) Stop MongoDB manually and try again"
        echo ""
        echo -e "${CYAN}Example:${NC}"
        echo -e "  ./start-dev-docker.sh --force-cleanup"
        echo -e "  ./start-dev-docker.sh --port 27018"
        exit 1
    fi
fi

# Verify port is now available
if lsof -Pi :${MONGODB_PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}✗ Failed to free port ${MONGODB_PORT}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Port ${MONGODB_PORT} is available${NC}"

# Update .env if using custom port
if [ "$USE_CUSTOM_PORT" = true ] && [ -f ".env" ]; then
    echo -e "${YELLOW}📝 Updating .env with custom MongoDB port...${NC}"
    sed -i.bak "s|mongodb://\([^:]*\):\([^@]*\)@localhost:[0-9]*/\(.*\)|mongodb://\1:\2@localhost:${MONGODB_PORT}/\3|g" .env
    echo -e "${GREEN}✓ Updated .env${NC}"
fi

# Start Docker services
echo -e "${YELLOW}🐳 Starting Docker services...${NC}"
$COMPOSE_CMD down 2>/dev/null
sleep 1

# Update docker-compose port if needed
if [ "$USE_CUSTOM_PORT" = true ]; then
    export MONGODB_PORT=$MONGODB_PORT
fi

$COMPOSE_CMD up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to start Docker services${NC}"
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1) Check Docker daemon: ${CYAN}docker ps${NC}"
    echo -e "  2) View logs: ${CYAN}$COMPOSE_CMD logs mongodb${NC}"
    echo -e "  3) Clean up: ${CYAN}$COMPOSE_CMD down -v${NC}"
    exit 1
fi

# Wait for MongoDB to be ready
echo -e "${YELLOW}⏳ Waiting for MongoDB to start...${NC}"
RETRY_COUNT=0
MAX_RETRIES=30
MONGO_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if $COMPOSE_CMD ps mongodb | grep -q "Up"; then
        # Additional check: try to connect to MongoDB
        if nc -z localhost ${MONGODB_PORT} 2>/dev/null || timeout 2 bash -c "echo > /dev/tcp/localhost/${MONGODB_PORT}" 2>/dev/null; then
            MONGO_READY=true
            break
        fi
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 1
done

if [ "$MONGO_READY" = true ]; then
    echo -e "${GREEN}✓ MongoDB running on localhost:${MONGODB_PORT}${NC}"
else
    echo -e "${RED}✗ MongoDB failed to start${NC}"
    echo -e "${YELLOW}Docker logs:${NC}"
    $COMPOSE_CMD logs mongodb
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cat > .env << EOF
# MongoDB Connection (Docker)
MONGO_URL=mongodb://admin:change_me_in_production@localhost:${MONGODB_PORT}/project-manager?authSource=admin

# JWT Secret (REQUIRED - Change in production!)
# Generate with: openssl rand -base64 32
JWT_SECRET=dev-secret-key-change-in-production-$(openssl rand -hex 16)

# Builder API (Optional)
NEXT_PUBLIC_BUILDER_API_KEY=

# Node Environment
NODE_ENV=development

# Next.js Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Socket configuration
SOCKET_SERVER_URL=http://localhost:4000
SOCKET_PORT=4000

# CORS Configuration
CORS_ORIGINS=http://localhost:3000
EOF
    echo -e "${GREEN}✓ Created .env${NC}"
    echo -e "${YELLOW}⚠️  Update MongoDB credentials and JWT_SECRET in .env for production${NC}"
else
    echo -e "${GREEN}✓ Using existing .env${NC}"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install

    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Failed to install dependencies${NC}"
        exit 1
    fi
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

# Display success message
echo -e "${BLUE}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Everything ready!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📱 App URL:${NC}        ${CYAN}http://localhost:3000${NC}"
echo -e "${YELLOW}🗄️  MongoDB:${NC}       ${CYAN}mongodb://localhost:${MONGODB_PORT}/project-manager${NC}"
echo -e "${YELLOW}📊 Username:${NC}       ${CYAN}admin${NC}"
echo -e "${YELLOW}📊 Password:${NC}       ${CYAN}check .env file${NC}"
echo ""
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

    echo -e "${YELLOW}Shutting down Docker services...${NC}"
    $COMPOSE_CMD down

    echo -e "${GREEN}✓ Shutdown complete${NC}"
    exit 0
}

# Set trap before starting the app
trap cleanup EXIT INT TERM QUIT HUP

echo -e "${YELLOW}Starting application with Socket.io server...${NC}\n"

# Start the application with Socket.io server and capture PID
npm run dev:socket &
NEXT_PID=$!

# Wait for the process
wait $NEXT_PID
