import mongoose from 'mongoose';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/pm_gestion';

if (!MONGO_URL) {
  throw new Error('❌ MONGO_URL must be defined in .env');
}

// Optimized configuration for production
const isProduction = process.env.NODE_ENV === 'production';

const options = {
  // Connection pool optimisé
  maxPoolSize: isProduction ? 20 : 10, // Plus de connexions en prod
  minPoolSize: isProduction ? 5 : 2,
  maxIdleTimeMS: 30000, // Fermer les connexions idle après 30s

  // Timeouts
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000, // Vérifier la connexion toutes les 10s

  // Network
  family: 4, // IPv4

  // Retry
  retryWrites: true,
  retryReads: true,

  // Compression pour réduire la bande passante
  compressors: ['zlib', 'snappy'],
  zlibCompressionLevel: 6,

  // Write concern pour la cohérence
  w: 'majority',
  wtimeoutMS: 5000,

  // Read preference pour les performances de lecture
  readPreference: 'primaryPreferred',

  // Auto-index en développement uniquement
  autoIndex: !isProduction,
  autoCreate: !isProduction
};

// Connection cache for Next.js (hot reload)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URL, options).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }

  return cached.conn;
}

// Event listeners for monitoring
mongoose.connection.on('connected', () => {
  console.log('MongoDB: Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB: Error', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB: Disconnected');
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Closing MongoDB connection...`);
  try {
    await mongoose.connection.close();
    console.log('MongoDB: Connection closed gracefully');
    process.exit(0);
  } catch (error) {
    console.error('Error during MongoDB disconnection:', error);
    process.exit(1);
  }
};

// Handle different shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Helper pour vérifier l'état de la connexion
export const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Helper pour obtenir les stats de la connexion
export const getConnectionStats = () => {
  const conn = mongoose.connection;
  return {
    readyState: conn.readyState,
    host: conn.host,
    port: conn.port,
    name: conn.name,
    collections: Object.keys(conn.collections).length
  };
};

export default connectDB;
