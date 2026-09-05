// @ts-check
/**
 * lib/validate.js
 * Middleware de validation centralisé pour les routes API Next.js.
 * Utilise les schémas Zod de lib/schemas.js.
 */
import { NextResponse } from 'next/server';

/**
 * Valide le body JSON d'une requête contre un schéma Zod.
 * Retourne { success: true, data } ou { success: false, response: NextResponse }
 *
 * @param {Request} request - La requête Next.js
 * @param {import('zod').ZodSchema} schema - Le schéma Zod à utiliser
 * @returns {Promise<{ success: boolean, data?: any, response?: NextResponse }>}
 *
 * @example
 * const validation = await validateBody(request, createTaskSchema);
 * if (!validation.success) return validation.response;
 * const { titre, description } = validation.data;
 */
export async function validateBody(request, schema) {
  let body;

  try {
    body = await request.json();
  } catch {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, error: 'Corps de la requête invalide (JSON attendu)' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.errors[0];
    const field = firstError?.path?.join('.') || 'inconnu';
    const message = firstError?.message || 'Validation échouée';

    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: `${message}`,
          field,
          details: result.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 422 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Valide les query params d'une requête contre un schéma Zod.
 * Retourne { success: true, data } ou { success: false, response: NextResponse }
 *
 * @param {URL} url - L'URL parsée (new URL(request.url))
 * @param {import('zod').ZodSchema} schema - Le schéma Zod
 * @returns {{ success: boolean, data?: any, response?: NextResponse }}
 */
export function validateQuery(url, schema) {
  const params = Object.fromEntries(url.searchParams.entries());

  // Coerce numeric strings for common pagination params
  /** @type {Record<string, string | number>} */
  const coerced = {};
  for (const [key, val] of Object.entries(params)) {
    const num = Number(val);
    coerced[key] = !isNaN(num) && val !== '' ? num : val;
  }

  const result = schema.safeParse(coerced);

  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: firstError?.message || 'Paramètres de requête invalides',
          field: firstError?.path?.join('.'),
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

/**
 * Schéma de pagination commun (réutilisable par toutes les routes list)
 */
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  sort: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).optional(),
});

/**
 * Parse standard pagination params from a request URL.
 * @param {Request} request - The incoming request
 * @param {{ defaultLimit?: number, maxLimit?: number }} [options]
 * @returns {{ page: number, limit: number, skip: number, sort: string | undefined, order: string, search: string | undefined }}
 */
export function parsePagination(request, options = {}) {
  const { defaultLimit = 20, maxLimit = 500 } = options;
  const url = new URL(request.url);
  const page = Math.max(parseInt(url.searchParams.get('page') ?? '') || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') ?? '') || defaultLimit, 1),
    maxLimit
  );
  const skip = (page - 1) * limit;
  const sort = url.searchParams.get('sort') || undefined;
  const order = url.searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const search = url.searchParams.get('search') || undefined;
  return { page, limit, skip, sort, order, search };
}

/**
 * Build a standardized pagination metadata object for API responses.
 * @param {number} total - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @returns {{ total: number, page: number, limit: number, totalPages: number }}
 */
export function buildPaginationMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
