import { NextResponse } from 'next/server';

/**
 * This route handles Socket.io WebSocket upgrades
 * Next.js doesn't natively support WebSocket in API routes,
 * so Socket.io will fall back to polling.
 * 
 * For production with WebSocket support, consider:
 * 1. Using a separate Node.js server for socket.io
 * 2. Using Vercel with socket.io package
 * 3. Using a proxy like nginx for WebSocket upgrade
 */

export async function GET(_request) {
  return NextResponse.json({
    message: 'Socket.io is configured to use polling transport',
    info: 'For WebSocket support, please use a separate socket.io server'
  });
}
