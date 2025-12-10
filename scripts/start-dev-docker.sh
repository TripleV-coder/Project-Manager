#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose found${NC}"
else
    echo -e "${RED}✗ Docker Compose not found${NC}"
    echo -e "${YELLOW}Install Docker Compose from: https://docs.docker.com/compose/install/${NC}"
    exit 1
fi

# Start Docker services
echo -e "${YELLOW}🐳 Starting Docker services...${NC}"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Failed to start Docker services${NC}"
    exit 1
fi

sleep 3

# Check if MongoDB is running
echo -e "${YELLOW}📋 Checking MongoDB connection...${NC}"
if docker-compose ps mongodb | grep -q "Up"; then
    echo -e "${GREEN}✓ MongoDB running on localhost:27017${NC}"
else
    echo -e "${RED}✗ MongoDB failed to start${NC}"
    docker-compose logs mongodb
    exit 1
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}📝 Creating .env file...${NC}"
    cat > .env << EOF
# MongoDB Connection (Docker)
MONGO_URL=mongodb://admin:admin123@localhost:27017/project-manager?authSource=admin

# JWT Secret (Change in production!)
JWT_SECRET=your-super-secret-key-min-32-chars-long-change-in-prod

# Builder API
NEXT_PUBLIC_BUILDER_API_KEY=995e44ebc86544ad9c736e6e81532e68

# Node Environment
NODE_ENV=development
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

# Clear Next.js cache
if [ -d ".next" ]; then
    echo -e "${YELLOW}🧹 Cleaning Next.js cache...${NC}"
    rm -rf .next
fi

# Start the application
echo -e "${BLUE}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Everything ready!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "${YELLOW}Starting application...${NC}"
echo -e "${BLUE}📱 App URL: http://localhost:3000${NC}"
echo -e "${BLUE}🗄️  MongoDB: mongodb://localhost:27017/project-manager${NC}"
echo -e "${BLUE}📊 Username: admin | Password: admin123${NC}\n"

npm run dev

# Cleanup on exit
trap 'echo -e "\n${YELLOW}Shutting down Docker services...${NC}"; docker-compose down; exit' EXIT INT TERM
