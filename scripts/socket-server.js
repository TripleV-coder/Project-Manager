#!/usr/bin/env node

/**
 * Standalone Socket.io server for real-time synchronization
 * Run separately from Next.js dev server
 *
 * Usage: node scripts/socket-server.js
 * Or in package.json: "socket": "node scripts/socket-server.js"
 */

const { createServer } = require('http');
const crypto = require('crypto');
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
let User, Project, Task, _ProjectRole, _Role;

const loadModels = async () => {
  try {
    const userModule = require('../models/User');
    const projectModule = require('../models/Project');
    const projectRoleModule = require('../models/ProjectRole');
    const roleModule = require('../models/Role');
    const taskModule = require('../models/Task');

    // Handle both ES6 default exports and CommonJS
    User = userModule.default || userModule;
    Project = projectModule.default || projectModule;
    Task = taskModule.default || taskModule;
    _ProjectRole = projectRoleModule.default || projectRoleModule;
    _Role = roleModule.default || roleModule;

    console.log('✓ Models loaded');
  } catch (error) {
    console.error('✗ Error loading models:', error);
  }
};

// Permission merging function
const getMergedPermissions = (systemRole, projectRole) => {
  const permissions = {};

  const ALL_PERMISSIONS = [
    'voirTousProjets',
    'voirSesProjets',
    'creerProjet',
    'supprimerProjet',
    'modifierCharteProjet',
    'gererMembresProjet',
    'changerRoleMembre',
    'gererTaches',
    'deplacerTaches',
    'prioriserBacklog',
    'gererSprints',
    'modifierBudget',
    'voirBudget',
    'voirTempsPasses',
    'saisirTemps',
    'validerLivrable',
    'gererFichiers',
    'commenter',
    'recevoirNotifications',
    'genererRapports',
    'voirAudit',
    'gererUtilisateurs',
    'adminConfig',
  ];

  ALL_PERMISSIONS.forEach((permission) => {
    const systemAllows = systemRole?.permissions?.[permission] === true;
    let projectAllows = true;

    if (projectRole) {
      projectAllows = projectRole?.permissions?.[permission] === true;
    }

    permissions[permission] = systemAllows && projectAllows;
  });

  return permissions;
};

const AUTH_COOKIE_NAME = 'auth_token';
const INTERNAL_EMIT_SECRET = process.env.SOCKET_EMIT_SECRET || process.env.JWT_SECRET;

const isJwtLike = (token) => typeof token === 'string' && token.split('.').length === 3;

const getTokenFromCookieHeader = (cookieHeader) => {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader
    .split(';')
    .map((entry) => entry.trim().split('='))
    .reduce((acc, [name, value]) => {
      acc[name] = value;
      return acc;
    }, {});

  return cookies[AUTH_COOKIE_NAME] || null;
};

const compareSecrets = (receivedSecret) => {
  const normalizedSecret = Array.isArray(receivedSecret) ? receivedSecret[0] : receivedSecret;

  if (!normalizedSecret || !INTERNAL_EMIT_SECRET) {
    return false;
  }

  const received = Buffer.from(normalizedSecret);
  const expected = Buffer.from(INTERNAL_EMIT_SECRET);

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
};

const getSocketAuthToken = (socket) => {
  const handshakeToken = socket.handshake.auth?.token;
  if (isJwtLike(handshakeToken)) {
    return handshakeToken;
  }

  const cookieToken = getTokenFromCookieHeader(socket.handshake.headers?.cookie);
  if (cookieToken) {
    return cookieToken;
  }

  return null;
};

const disconnectUserSockets = (userId, reason = 'revoked') => {
  io.sockets.sockets.forEach((socket) => {
    if (socket.userId === userId) {
      socket.emit('auth:revoked', { reason });
      socket.disconnect(true);
    }
  });
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
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const secret = req.headers['x-socket-secret'];
        if (!compareSecrets(secret)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized emit request' }));
          return;
        }

        const { type, projectId, userId, permission, event, data } = JSON.parse(body);

        if (!type) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing emit type' }));
          return;
        }

        switch (type) {
          case 'project':
            if (projectId && typeof event === 'string') {
              io.to(`project:${projectId}`).emit(event, data);
            }
            break;

          case 'user':
            if (userId && typeof event === 'string') {
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
            if (typeof event === 'string') {
              io.emit(event, data);
            }
            break;

          case 'disconnect-user':
            if (userId) {
              disconnectUserSockets(userId, data?.reason || 'revoked');
            }
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
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6, // 1MB limite par message
});

// ==================== RATE LIMITING ====================

const ipRequests = new Map();
const IP_RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_IP = 100;

// Nettoyage périodique de la Map des IPs
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequests.entries()) {
    if (record.resetTime < now) {
      ipRequests.delete(ip);
    }
  }
}, IP_RATE_LIMIT_WINDOW);

const checkIpRateLimit = (ip) => {
  if (!ip) return true;
  const now = Date.now();
  let record = ipRequests.get(ip);
  if (!record || record.resetTime < now) {
    record = { count: 1, resetTime: now + IP_RATE_LIMIT_WINDOW };
    ipRequests.set(ip, record);
    return true;
  }
  record.count++;
  return record.count <= MAX_REQUESTS_PER_IP;
};

// Middleware IP Rate Limiting (au niveau du handshake Engine.IO)
io.engine.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!checkIpRateLimit(ip)) {
    res.writeHead(429, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Too Many Requests' }));
    return;
  }
  next();
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
  } catch (_error) {
    return null;
  }
};

// Socket.io middleware
io.use(async (socket, next) => {
  try {
    const token = getSocketAuthToken(socket);

    if (!token) {
      return next(new Error('Authentication error: missing token'));
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return next(new Error('Authentication error: invalid token'));
    }

    const user = await User.findById(payload.userId).populate('role_id').lean();

    if (!user) {
      return next(new Error('Authentication error: user not found'));
    }

    if (user.status !== 'Actif') {
      return next(new Error('Authentication error: inactive user'));
    }

    if ((payload.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return next(new Error('Authentication error: revoked token'));
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
  console.log(`✓ User connected: ${socket.userId} - Socket: ${socket.id}`);

  // Rate Limiting par Socket / Événement
  const EVENT_RATE_LIMIT_WINDOW = 10000; // 10 secondes
  const MAX_EVENTS_PER_WINDOW = 50;

  socket.use((packet, next) => {
    const now = Date.now();
    if (!socket.rateLimit) {
      socket.rateLimit = { count: 1, resetTime: now + EVENT_RATE_LIMIT_WINDOW };
      return next();
    }

    if (socket.rateLimit.resetTime < now) {
      socket.rateLimit = { count: 1, resetTime: now + EVENT_RATE_LIMIT_WINDOW };
      return next();
    }

    socket.rateLimit.count++;
    if (socket.rateLimit.count > MAX_EVENTS_PER_WINDOW) {
      console.warn(
        `[Rate Limit] Socket ${socket.id} (User: ${socket.userId}) a dépassé la limite d'événements.`
      );
      socket.emit('error', { message: 'Trop de requêtes détectées. Ralentissez.' });
      return next(new Error('Rate limit exceeded'));
    }

    next();
  });

  // Join user's private room
  socket.join(`user:${socket.userId}`);

  // Join project rooms
  socket.on('join:project', async (projectId) => {
    try {
      const project = await Project.findById(projectId)
        .select('chef_projet product_owner créé_par membres')
        .populate({
          path: 'membres.project_role_id',
        })
        .lean();

      if (!project) {
        return socket.emit('error', { message: 'Projet non trouvé' });
      }

      // Find member data
      const memberData = project.membres?.find((m) => m.user_id?.toString() === socket.userId);

      // Check access to project
      const hasSystemAccess =
        socket.userRole?.permissions?.voirTousProjets || socket.userRole?.permissions?.adminConfig;

      const isMember =
        project.chef_projet?.toString() === socket.userId ||
        project.product_owner?.toString() === socket.userId ||
        project.créé_par?.toString() === socket.userId ||
        memberData !== undefined;

      const assignedHere = Task
        ? Boolean(await Task.exists({ projet_id: projectId, assigné_à: socket.userId }))
        : false;

      const canAccessProject = hasSystemAccess || isMember || assignedHere;

      if (!canAccessProject) {
        return socket.emit('error', { message: 'Accès refusé au projet' });
      }

      // Merge permissions with project role
      // CRITICAL: Extract only the permissions object (not the visibleMenus)
      const projectRole = memberData?.project_role_id;
      const merged = getMergedPermissions(socket.userRole, projectRole);
      socket.mergedPermissions = merged;
      socket.projectId = projectId;
      socket.memberData = memberData;

      socket.join(`project:${projectId}`);
      console.log(`✓ User ${socket.userId} joined project ${projectId} with merged permissions`);

      // Notify others that user is online
      socket.to(`project:${projectId}`).emit('user:online', {
        userId: socket.userId,
        userEmail: socket.userEmail,
        userName: socket.userName,
      });
    } catch (error) {
      console.error('Error joining project:', error);
      socket.emit('error', { message: 'Erreur lors de la connexion au projet' });
    }
  });

  // Leave project room
  socket.on('leave:project', (projectId) => {
    socket.leave(`project:${projectId}`);
    socket.mergedPermissions = socket.userPermissions;
    console.log(`✓ User ${socket.userId} left project ${projectId}`);

    socket.to(`project:${projectId}`).emit('user:offline', {
      userId: socket.userId,
      userEmail: socket.userEmail,
    });
  });

  // Generic event relay for non-confidential data
  socket.on('forward:event', (_eventName, _data, ack) => {
    if (typeof ack === 'function') {
      ack({ error: 'Client-side event forwarding is disabled' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`✗ User disconnected: ${socket.userId}`);
  });
});

// Start server
const PORT = process.env.SOCKET_PORT || 4000;

connectDB()
  .then(() => {
    loadModels();

    httpServer.listen(PORT, () => {
      console.log(`\n🚀 Socket.io server listening on port ${PORT}`);
      console.log(`   URL: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
      console.log(`   Transport: websocket, polling\n`);
    });
  })
  .catch((error) => {
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
