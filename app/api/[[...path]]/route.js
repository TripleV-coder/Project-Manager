import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('api-404');

/**
 * ==========================================
 * MONOLITHE API SUPPRIMÉ
 * ==========================================
 *
 * L'ancienne API monolithique (catch-all route) a été décomposée en routes dédiées
 * pour de meilleures performances et une maintenance simplifiée.
 *
 * Si vous atteignez ce fichier, cela signifie que la route API demandée n'existe pas
 * dans le nouveau système de routage.
 */

export async function GET(request) {
  return handleNotFound(request);
}

export async function POST(request) {
  return handleNotFound(request);
}

export async function PUT(request) {
  return handleNotFound(request);
}

export async function DELETE(request) {
  return handleNotFound(request);
}

export async function OPTIONS(request) {
  const origin = request.headers.get('origin');
  const isDev = process.env.NODE_ENV !== 'production';
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : isDev
      ? ['http://localhost:3000']
      : [];

  const response = new NextResponse(null, { status: 204 });
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

function handleNotFound(request) {
  const url = new URL(request.url);
  log.warn(
    `[API 404] Route non trouvée dans la nouvelle architecture: ${request.method} ${url.pathname}`
  );

  return NextResponse.json(
    {
      error: 'Route non trouvée',
      message: "Cette route n'existe pas ou a été déplacée lors de la restructuration de l'API.",
    },
    { status: 404 }
  );
}
