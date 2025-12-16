import { APIResponse } from '@/lib/apiResponse';
import { validationSchemas } from '@/lib/validationSchemas';

/**
 * Middleware de validation pour les requêtes
 * Valide le body contre un schéma Zod
 */
export async function validateInput(request, schemaKey) {
  try {
    const schema = validationSchemas[schemaKey];
    if (!schema) {
      console.warn(`Schema de validation manquant: ${schemaKey}`);
      return { valid: true, data: {} };
    }

    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return {
        valid: false,
        response: APIResponse.error('JSON invalide', 400, null, 'INVALID_JSON')
      };
    }

    // Valider avec Zod
    try {
      const data = await schema.parseAsync(body);
      return { valid: true, data };
    } catch (error) {
      const errors = error.errors?.map(e => ({
        field: e.path.join('.') || 'root',
        message: e.message
      })) || [];

      return {
        valid: false,
        response: APIResponse.validationError(errors, 400)
      };
    }
  } catch (error) {
    console.error('Erreur validation:', error);
    return {
      valid: false,
      response: APIResponse.error('Erreur interne de validation', 500)
    };
  }
}

/**
 * Helper pour valider et extrait le body de la requête
 * @param {Request} request - La requête Next.js
 * @param {string} schemaKey - Clé du schéma de validation
 * @returns {Promise<{valid: boolean, data?: any, response?: Response}>}
 */
export async function withValidation(request, schemaKey) {
  return validateInput(request, schemaKey);
}
