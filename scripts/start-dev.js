#!/usr/bin/env node

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  console.log('\n' + colors.blue + '━'.repeat(50) + colors.reset);
  log('blue', `  ${title}`);
  console.log(colors.blue + '━'.repeat(50) + colors.reset + '\n');
}

async function checkMongoDB() {
  log('yellow', '📋 Checking MongoDB installation...');
  
  const mongoCommand = process.platform === 'win32' ? 'mongod.exe' : 'mongod';
  const result = spawnSync('which', [mongoCommand], { shell: true });
  
  if (result.status !== 0) {
    log('red', '✗ MongoDB not found');
    log('yellow', '\nInstall MongoDB:');
    console.log('  macOS:  brew install mongodb-community');
    console.log('  Ubuntu: sudo apt-get install -y mongodb');
    console.log('  Windows: https://www.mongodb.com/try/download/community');
    process.exit(1);
  }
  
  log('green', '✓ MongoDB found');
}

function createDataDir() {
  const dataDir = path.join(process.cwd(), 'data', 'db');
  
  if (!fs.existsSync(dataDir)) {
    log('yellow', '📁 Creating MongoDB data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
    log('green', `✓ Created ${dataDir}`);
  }
}

function startMongoDB() {
  log('yellow', '🗄️  Starting MongoDB...');
  
  const dataDir = path.join(process.cwd(), 'data', 'db');
  const logPath = path.join(process.cwd(), 'data', 'mongodb.log');
  
  const args = ['--dbpath', dataDir, '--logpath', logPath, '--logappend'];
  
  if (process.platform !== 'win32') {
    args.push('--fork');
  }
  
  try {
    const mongod = spawn('mongod', args, {
      stdio: 'ignore',
      detached: true,
    });
    
    mongod.unref();
    
    // Wait for MongoDB to start
    setTimeout(() => {
      log('green', '✓ MongoDB running on localhost:27017');
    }, 2000);
    
    return true;
  } catch (error) {
    log('red', `✗ Failed to start MongoDB: ${error.message}`);
    return false;
  }
}

function createEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    log('yellow', '📝 Creating .env file...');
    
    const envContent = `# MongoDB Connection (Local)
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
`;
    
    fs.writeFileSync(envPath, envContent);
    log('green', '✓ Created .env');
    log('yellow', '⚠️  Remember to update JWT_SECRET in production!');
  }
}

function installDependencies() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    log('yellow', '📦 Installing dependencies...');
    
    const npm = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install'], {
      stdio: 'inherit',
    });
    
    return new Promise((resolve) => {
      npm.on('close', (code) => {
        if (code === 0) {
          log('green', '✓ Dependencies installed');
          resolve(true);
        } else {
          log('red', '✗ Failed to install dependencies');
          resolve(false);
        }
      });
    });
  }
  
  return Promise.resolve(true);
}

function cleanNextCache() {
  const nextDir = path.join(process.cwd(), '.next');
  
  if (fs.existsSync(nextDir)) {
    log('yellow', '🧹 Cleaning Next.js cache...');
    fs.rmSync(nextDir, { recursive: true, force: true });
  }
}

async function startApp() {
  header('🚀 PM - Gestion de Projets - Startup Script');
  
  // Check prerequisites
  await checkMongoDB();
  createDataDir();
  
  // Start MongoDB
  if (!startMongoDB()) {
    process.exit(1);
  }
  
  // Setup
  createEnvFile();
  const installed = await installDependencies();
  if (!installed) process.exit(1);
  
  cleanNextCache();
  
  // Ready to start
  header('✓ Everything ready!');
  
  log('yellow', 'Starting application...');
  log('blue', '📱 App URL: http://localhost:3000');
  log('blue', '🗄️  MongoDB: mongodb://localhost:27017/project-manager\n');
  
  // Start Next.js dev server
  const npm = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
  });
  
  // Cleanup on exit
  process.on('SIGINT', () => {
    log('yellow', '\n\nShutting down...');
    if (process.platform !== 'win32') {
      spawnSync('pkill', ['-f', 'mongod']);
    } else {
      spawnSync('taskkill', ['/IM', 'mongod.exe', '/F']);
    }
    process.exit(0);
  });
}

startApp().catch((error) => {
  log('red', `Error: ${error.message}`);
  process.exit(1);
});
