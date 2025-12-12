#!/usr/bin/env node

/**
 * Standalone Socket.io server for real-time synchronization
 * Run separately from Next.js dev server
 * 
 * Usage: node scripts/socket-server.js
 * Or in package.json: "socket": "node scripts/socket-server.js"
 */

const { createServer } = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URL) {
      throw new Error('MONGO_URL not defined in environment');
    }
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Load models
let User, Project, ProjectRole, Role;

const loadModels = async () => {
  try {
    const userModule = require('../models/User');
    const projectModule = require('../models/Project');
    const projectRoleModule = require('../models/ProjectRole');
    const roleModule = require('../models/Role');

    // Handle both ES6 default exports and CommonJS
    User = userModule.default || userModule;
    Project = projectModule.default || projectModule;
    ProjectRole = projectRoleModule.default || projectRoleModule;
    Role = roleModule.default || roleModule;

    console.log('✓ Models loaded');
  } catch (error) {
    console.error('✗ Error loading models:', error);
  }
};

// Permission merging function
const getMergedPermissions = (systemRole, projectRole) => {
  const permissions = {};

  const ALL_PERMISSIONS = [
    'voirTousProjets', 'voirSesProjets', 'creerProjet', 'supprimerProjet',
    'modifierCharteProjet', 'gererMembresProjet', 'changerRoleMembre',
    'gererTaches', 'deplacerTaches', 'prioriserBacklog', 'gererSprints',
    'modifierBudget', 'voirBudget', 'voirTempsPasses', 'saisirTemps',
    'validerLivrable', 'gererFichiers', 'commenter', 'recevoirNotifications',
    'genererRapports', 'voirAudit', 'gererUtilisateurs', 'adminConfig'
  ];

  ALL_PERMISSIONS.forEach(permission => {
    const systemAllows = systemRole?.permissions?.[permission] === true;
    let projectAllows = true;

    if (projectRole) {
      projectAllows = projectRole?.permissions?.[permission] === true;
    }

    permissions[permission] = systemAllows && projectAllows;
  });

  return permissions;
};

// Create HTTP server with event emission endpoint
const httpServer = createServer(async (req, res) => {
  // Health check endpoint
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket.io server is running\n');
    return;
  }

  // Event emission endpoint
  if (req.url === '/emit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { type, projectId, userId, permission, event, data } = JSON.parse(body);

        switch (type) {
          case 'project':
            if (projectId) {
              io.to(`project:${projectId}`).emit(event, data);
            }
            break;

          case 'user':
            if (userId) {
              io.to(`user:${userId}`).emit(event, data);
            }
            break;

          case 'permission':
            io.sockets.sockets.forEach((socket) => {
              if (socket.mergedPermissions?.[permission]) {
                socket.emit(event, data);
              }
            });
            break;

          case 'broadcast':
            io.emit(event, data);
            break;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('Error processing emit request:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request' }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found\n');
});

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Import jwt verification
const { jwtVerify } = require('jose');

// CRITICAL: JWT_SECRET must be defined in environment
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required.');
  process.exit(1);
}

const verifyToken = async (token) => {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    return null;
  }
};

// Socket.io middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error: missing token'));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return next(new Error('Authentication error: invalid token'));
    }

    const user = await User.findById(payload.userId)
      .populate('role_id')
      .lean();

    if (!user) {
      return next(new Error('Authentication error: user not found'));
    }

    socket.userId = user._id.toString();
    socket.userEmail = user.email;
    socket.userName = user.nom_complet;
    socket.userRole = user.role_id;
    socket.userPermissions = user.role_id?.permissions || {};
    // Initialize merged permissions with system permissions (will be updated per project)
    socket.mergedPermissions = socket.userPermissions;

    next();
  } catch (error) {
    console.error('Socket auth error:', error);
    next(new Error('Authentication error'));
  }
});

// Connection event
io.on('connection', (socket) => {
  console.log(`✓ User connected: ${socket.userEmail} (${socket.userId}) - Socket: ${socket.id}`);

  // Join user's private room
  socket.join(`user:${socket.userId}`);

  // Join project rooms
  socket.on('join:project', async (projectId) => {
    try {
      const project = await Project.findById(projectId)
        .select('chef_projet product_owner membres')
        .populate({
          path: 'membres.project_role_id'
        })
        .lean();

      if (!project) {
        return socket.emit('error', { message: 'Projet non trouvé' });
      }

      // Find member data
      const memberData = project.membres?.find(m =>
        m.user_id?.toString() === socket.userId
      );

      // Check access to project
      const hasSystemAccess = socket.userRole?.permissions?.voirTousProjets ||
        socket.userRole?.permissions?.adminConfig;

      const isMember =
        project.chef_projet?.toString() === socket.userId ||
        project.product_owner?.toString() === socket.userId ||
        memberData !== undefined;

      const canAccessProject = hasSystemAccess || isMember;

      if (!canAccessProject) {
        return socket.emit('error', { message: 'Accès refusé au projet' });
      }

      // Merge permissions with project role
      // CRITICAL: Extract only the permissions object (not the visibleMenus)
      const projectRole = memberData?.project_role_id;
      const merged = getMergedPermissions(socket.userRole, projectRole);
      socket.mergedPermissions = merged.permissions;  // ← Only permissions, not visibleMenus
      socket.projectId = projectId;
      socket.memberData = memberData;

      socket.join(`project:${projectId}`);
      console.log(`✓ User ${socket.userEmail} joined project ${projectId} with merged permissions`);

      // Notify others that user is online
      socket.to(`project:${projectId}`).emit('user:online', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        userName: socket.userName
      });
    } catch (error) {
      console.error('Error joining project:', error);
      socket.emit('error', { message: 'Erreur lors de la connexion au projet' });
    }
  });

  // Leave project room
  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
    console.log(`✓ User ${socket.userEmail} left project ${projectId}`);

    socket.to(`project:${projectId}`).emit('user:offline', {
      userId: socket.userId,
      userEmail: socket.userEmail
    });
  });

  // Generic event relay for non-confidential data
  socket.on('forward:event', (eventName, data) => {
    if (data.projectId) {
      socket.to(`project:${data.projectId}`).emit(eventName, data);
    } else {
      socket.broadcast.emit(eventName, data);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`✗ User disconnected: ${socket.userEmail}`);
  });
});

// Start server
const PORT = process.env.SOCKET_PORT || 4000;

connectDB().then(() => {
  loadModels();

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Socket.io server listening on port ${PORT}`);
    console.log(`   URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
    console.log(`   Transport: websocket, polling\n`);
  });
}).catch((error) => {
  console.error('✗ Failed to start socket server:', error.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✓ Shutting down gracefully...');
  io.close();
  mongoose.connection.close();
  httpServer.close();
  process.exit(0);
});
