import { z } from 'zod';

/**
 * Centralized input validation schemas
 * All API endpoints should use these schemas to validate request data
 * Prevents injection attacks and ensures data integrity
 */

// Base schemas for common fields
const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid ID format');
const email = z.string().email('Invalid email format');
const dateString = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));
const positiveNumber = z.number().positive('Must be positive');
const nonNegativeNumber = z.number().nonnegative('Must be zero or positive');

// Project schemas
export const createProjectSchema = z.object({
  nom: z.string().min(3).max(255, 'Project name must be 3-255 characters'),
  description: z.string().max(1000).optional(),
  date_début: dateString,
  date_fin_prévue: dateString,
  product_owner: objectId.optional(),
  membres: z.array(objectId).default([]),
  template_id: objectId.optional()
});

export const updateProjectSchema = z.object({
  nom: z.string().min(3).max(255).optional(),
  description: z.string().max(1000).optional(),
  date_début: dateString.optional(),
  date_fin_prévue: dateString.optional(),
  product_owner: objectId.optional(),
  // Aligned with Project model schema
  statut: z.enum(['Planification', 'En cours', 'En pause', 'Terminé', 'Annulé']).optional()
});

// Task schemas
export const createTaskSchema = z.object({
  projet_id: objectId,
  titre: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
  type: z.enum(['Épic', 'Story', 'Tâche', 'Bug']).default('Tâche'),
  statut: z.enum(['Backlog', 'À faire', 'En cours', 'Review', 'Terminé']).default('Backlog'),
  priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).default('Moyenne'),
  assigné_à: objectId.optional(),
  story_points: positiveNumber.optional(),
  estimation_heures: positiveNumber.optional(),
  sprint_id: objectId.optional(),
  deliverable_id: objectId.optional(),
  date_échéance: dateString.optional(),
  date_début: dateString.optional(),
  labels: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([])
});

export const updateTaskSchema = z.object({
  titre: z.string().min(3).max(255).optional(),
  description: z.string().max(5000).optional(),
  statut: z.enum(['Backlog', 'À faire', 'En cours', 'Review', 'Terminé']).optional(),
  priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
  assigné_à: objectId.optional().or(z.null()),
  story_points: positiveNumber.optional(),
  estimation_heures: positiveNumber.optional(),
  date_échéance: dateString.optional(),
  date_début: dateString.optional(),
  labels: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  priorité_ordre: nonNegativeNumber.optional()
});

// Sprint schemas
export const createSprintSchema = z.object({
  projet_id: objectId,
  nom: z.string().min(3).max(255),
  objectif: z.string().max(1000).optional(),
  date_début: dateString,
  date_fin: dateString,
  capacité_équipe: positiveNumber.optional()
});

export const updateSprintSchema = z.object({
  nom: z.string().min(3).max(255).optional(),
  objectif: z.string().max(1000).optional(),
  date_début: dateString.optional(),
  date_fin: dateString.optional(),
  statut: z.enum(['Planifié', 'Actif', 'Terminé']).optional(),
  capacité_équipe: positiveNumber.optional()
});

// Timesheet schemas - NOTE: Model uses task_id (English), frontend may send tâche_id (French)
// API handlers should map tâche_id -> task_id
export const createTimesheetSchema = z.object({
  projet_id: objectId,
  task_id: objectId.optional(), // Standardized to match model
  tâche_id: objectId.optional(), // Accepted for backwards compatibility
  sprint_id: objectId.optional(),
  date: dateString,
  heures: positiveNumber.max(24, 'Cannot log more than 24 hours per day'),
  description: z.string().max(500).optional(),
  type_saisie: z.enum(['manuelle', 'timer']).default('manuelle')
});

// Comment schemas - aligned with Comment model
export const createCommentSchema = z.object({
  entity_type: z.enum(['projet', 'tâche', 'livrable', 'sprint']),
  entity_id: objectId,
  contenu: z.string().min(1).max(5000),
  parent_id: objectId.optional(),
  mentions: z.array(objectId).default([])
});

// Deliverable schemas
export const createDeliverableSchema = z.object({
  projet_id: objectId,
  type_id: objectId,
  nom: z.string().min(3).max(255),
  description: z.string().max(1000).optional(),
  assigné_à: objectId.optional(),
  date_échéance: dateString.optional()
});

// Budget schemas
export const updateBudgetSchema = z.object({
  budget_total: nonNegativeNumber.optional(),
  budget_dépensé: nonNegativeNumber.optional(),
  devise: z.enum(['EUR', 'USD', 'GBP']).default('EUR').optional(),
  notes: z.string().max(1000).optional()
});

// Authentication schemas
export const loginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password required')
});

export const createUserSchema = z.object({
  nom_complet: z.string().min(2).max(255),
  email: email,
  password: z.string()
    .min(8, 'Password must be 8+ characters')
    .max(12, 'Password must be 12 characters or less')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain digit')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain special character'),
  password_confirm: z.string()
}).refine((data) => data.password === data.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm']
});

export const updateUserSchema = z.object({
  nom_complet: z.string().min(2).max(255).optional(),
  email: email.optional(),
  poste_titre: z.string().max(255).optional(),
  département_équipe: z.string().max(255).optional(),
  avatar: z.string().max(500).optional(),
  compétences: z.array(z.string()).optional(),
  // Status - aligned with User model enum (French with capitals)
  status: z.enum(['Actif', 'Désactivé', 'Suspendu']).optional()
});

/**
 * Generic validation helper
 * Usage: await validateRequest(body, createProjectSchema)
 */
export async function validateRequest(data, schema) {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw {
        statusCode: 400,
        message: 'Validation failed',
        details: messages
      };
    }
    throw error;
  }
}

/**
 * Safe validation that returns errors instead of throwing
 */
export async function validateRequestSafe(data, schema) {
  const result = await schema.safeParseAsync(data);
  
  if (!result.success) {
    const errors = result.error.errors.reduce((acc, e) => {
      const path = e.path.join('.');
      acc[path] = e.message;
      return acc;
    }, {});
    
    return {
      valid: false,
      errors
    };
  }
  
  return {
    valid: true,
    data: result.data
  };
}
