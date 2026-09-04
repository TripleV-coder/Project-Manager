import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'ID invalide');

export const firstAdminSchema = z
  .object({
    nom_complet: z.string().min(3, 'Nom complet requis').max(100),
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Mot de passe requis'),
    password_confirm: z.string().min(8, 'Confirmation requise'),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['password_confirm'],
  });

export const loginRequestSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export const firstLoginResetSchema = z
  .object({
    temporary_password: z.string().min(1, 'Mot de passe temporaire requis'),
    new_password: z.string().min(8, 'Nouveau mot de passe requis'),
    new_password_confirm: z.string().min(8, 'Confirmation requise'),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['new_password_confirm'],
  });

export const managedUserSchema = z.object({
  nom_complet: z.string().min(3, 'Nom complet requis').max(100),
  email: z.string().email('Email invalide'),
  role_id: objectId,
  status: z.enum(['Actif', 'Désactivé', 'Suspendu']).default('Actif'),
});

export const changeUserRoleSchema = z.object({
  role_id: objectId,
});

export function validateSchema(schema, payload) {
  const result = schema.safeParse(payload);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.errors[0]?.message || 'Validation échouée',
    details: result.error.errors.map((entry) => ({
      field: entry.path.join('.'),
      message: entry.message,
    })),
  };
}
