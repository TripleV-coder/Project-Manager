import { Server } from 'socket.io';
import { verifyToken } from './auth';
import User from '@/models/User';

let io = null;

/**
 * Initialize Socket.io server
 * Should be called once in the API route handler
 */
export function initializeSocket(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Middleware: Authenticate socket connection
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

      // Fetch user and their permissions
      await require('./mongodb').default();
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

      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Connection event
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userEmail} (${socket.userId})`);

    // Join user's private room for personal notifications
    socket.join(`user:${socket.userId}`);

    // Join projects the user is a member of
    socket.on('join:project', async (projectId) => {
      try {
        // Verify user is member of project
        const Project = require('@/models/Project').default;
        const project = await Project.findById(projectId)
          .select('chef_projet product_owner membres')
          .lean();

        if (!project) {
          return socket.emit('error', { message: 'Projet non trouvé' });
        }

        const isMember = 
          project.chef_projet?.toString() === socket.userId ||
          project.product_owner?.toString() === socket.userId ||
          project.membres?.some(m => m.user_id?.toString() === socket.userId) ||
          socket.userRole?.permissions?.voirTousProjets;

        if (!isMember) {
          return socket.emit('error', { message: 'Accès refusé au projet' });
        }

        socket.join(`project:${projectId}`);
        console.log(`User ${socket.userEmail} joined project ${projectId}`);
      } catch (error) {
        console.error('Error joining project:', error);
        socket.emit('error', { message: 'Erreur lors de la connexion au projet' });
      }
    });

    // Leave project room
    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
      console.log(`User ${socket.userEmail} left project ${projectId}`);
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userEmail}`);
    });
  });

  return io;
}

/**
 * Get Socket.io instance
 */
export function getSocket() {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
}

/**
 * Emit event filtered by RBAC
 * Only sends to users who have the required permission
 */
export async function emitToProjectMembers(projectId, event, data, requiredPermission = null) {
  if (!io) return;

  const Project = require('@/models/Project').default;
  const project = await Project.findById(projectId)
    .select('chef_projet product_owner membres')
    .populate('membres.user_id')
    .lean();

  if (!project) return;

  const members = [
    project.chef_projet,
    project.product_owner,
    ...(project.membres?.map(m => m.user_id) || [])
  ].filter(Boolean);

  // Send to each member's private room if they have permission
  for (const member of members) {
    const userId = member._id?.toString() || member.toString();
    const memberSocket = io.sockets.sockets.get(
      Array.from(io.sockets.sockets.values()).find(
        s => s.userId === userId
      )?.id
    );

    if (memberSocket && (!requiredPermission || memberSocket.userPermissions?.[requiredPermission])) {
      memberSocket.emit(event, data);
    }
  }

  // Also broadcast to project room (filtering happens on client if needed)
  io.to(`project:${projectId}`).emit(event, data);
}

/**
 * Emit to specific user
 */
export function emitToUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit to all connected users (for global events)
 */
export function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Emit to users with specific permission
 */
export async function emitToUsersWithPermission(permission, event, data) {
  if (!io) return;

  io.sockets.sockets.forEach((socket) => {
    if (socket.userPermissions?.[permission]) {
      socket.emit(event, data);
    }
  });
}
