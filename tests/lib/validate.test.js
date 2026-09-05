import { validateBody, validateQuery } from '@/lib/validate';
import { z } from 'zod';

// Mock NextResponse
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn().mockImplementation((body, init) => {
        return { body, status: init?.status || 200 };
      }),
    },
  };
});

describe('Validation Middleware', () => {
  const mockSchema = z.object({
    name: z.string().min(3, 'Nom trop court'),
    age: z.number().optional(),
  });

  describe('validateBody', () => {
    it('devrait retourner success: true si les données sont valides', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ name: 'TestUser', age: 25 }),
      };

      const result = await validateBody(mockRequest, mockSchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ name: 'TestUser', age: 25 });
      expect(result.response).toBeUndefined();
    });

    it('devrait retourner une NextResponse avec status 400 si la validation échoue', async () => {
      const mockRequest = {
        json: jest.fn().mockResolvedValue({ name: 'Te' }), // Trop court
      };

      const result = await validateBody(mockRequest, mockSchema);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.response.status).toBe(422);
      expect(result.response.body.success).toBe(false);
      expect(result.response.body.error).toBeDefined();
      expect(result.response.body.details).toHaveLength(1);
      expect(result.response.body.details[0].message).toBe('Nom trop court');
    });

    it('devrait retourner une NextResponse 400 si le body JSON est malformé', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Unexpected token')),
      };

      const result = await validateBody(mockRequest, mockSchema);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(400);
      expect(result.response.body.error).toBe('Corps de la requête invalide (JSON attendu)');
    });
  });

  describe('validateQuery', () => {
    const querySchema = z.object({
      page: z.number().int().positive(),
      search: z.string().optional(),
    });

    it('devrait valider et transformer correctement la query string', async () => {
      const mockUrl = new URL('http://localhost/api/test?page=2&search=hello');

      const result = await validateQuery(mockUrl, querySchema);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ page: 2, search: 'hello' });
    });

    it('devrait échouer si une valeur obligatoire est manquante ou invalide', async () => {
      const mockUrl = new URL('http://localhost/api/test?page=invalid');

      const result = await validateQuery(mockUrl, querySchema);

      expect(result.success).toBe(false);
      expect(result.response.status).toBe(400);
      expect(result.response.body.field).toContain('page');
    });
  });
});
