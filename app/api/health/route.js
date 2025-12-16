import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';

/**
 * Health check endpoint for monitoring and uptime services
 * Returns application health status and database connectivity
 */
export async function GET() {
  const startTime = Date.now();
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    checks: {}
  };

  try {
    // Check database connection
    try {
      await connectDB();
      
      // Verify connection is actually working with a simple ping
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        health.checks.database = {
          status: 'ok',
          connection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
        };
      }
    } catch (dbError) {
      health.status = 'degraded';
      health.checks.database = {
        status: 'error',
        error: dbError.message || 'Database connection failed'
      };
    }

    // Check memory usage
    const memory = process.memoryUsage();
    const memoryUsagePercent = (memory.heapUsed / memory.heapTotal) * 100;
    
    health.checks.memory = {
      status: memoryUsagePercent < 90 ? 'ok' : memoryUsagePercent < 95 ? 'warning' : 'critical',
      heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      usagePercent: memoryUsagePercent.toFixed(2)
    };

    // Check if memory is too high
    if (memoryUsagePercent >= 95) {
      health.status = 'degraded';
    }

    // Response time
    health.responseTime = `${Date.now() - startTime}ms`;

    // Determine overall status code
    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 503 : 500;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('[Health Check] Error:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message || 'Health check failed',
      checks: {
        database: { status: 'unknown' },
        memory: { status: 'unknown' }
      }
    }, { status: 500 });
  }
}

/**
 * Simple ready check (used by load balancers)
 * Returns 200 if application is ready to handle requests
 */
export async function HEAD() {
  try {
    await connectDB();
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    // Log l'erreur pour le monitoring mais ne pas exposer les détails
    console.error('[Health Check HEAD] Database connection failed:', error.message);
    return new NextResponse(null, { status: 503 });
  }
}
