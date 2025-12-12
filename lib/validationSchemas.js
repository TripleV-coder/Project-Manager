import { z } from 'zod';

// Schémas de validation réutilisables
export const validationSchemas = {
  // Auth
  login: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis')
  }),

  register: z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(8, 'Minimum 8 caractères'),
    nom_complet: z.string().min(2, 'Nom requis')
  }),

  // User
  createUser: z.object({
    email: z.string().email('Email invalide'),
    nom_complet: z.string().min(2, 'Nom requis'),
    poste_titre: z.string().optional(),
    département_équipe: z.string().optional(),
    role_id: z.string().optional()
  }),

  updateUser: z.object({
    nom_complet: z.string().min(2, 'Nom requis').optional(),
    email: z.string().email('Email invalide').optional(),
    poste_titre: z.string().optional(),
    département_équipe: z.string().optional(),
    avatar: z.string().optional(),
    status: z.enum(['actif', 'inactif', 'suspendu']).optional()
  }),

  // Project
  createProject: z.object({
    nom: z.string().min(3, 'Nom du projet requis'),
    description: z.string().optional(),
    template_id: z.string().min(1, 'Template requis'),
    priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
    date_début: z.string().datetime().optional(),
    date_fin_prévue: z.string().datetime().optional(),
    champs_dynamiques: z.record(z.any()).optional()
  }),

  updateProject: z.object({
    nom: z.string().min(3, 'Nom du projet requis').optional(),
    description: z.string().optional(),
    statut: z.enum(['Planification', 'En cours', 'En pause', 'Terminé', 'Annulé']).optional(),
    priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
    date_début: z.string().datetime().optional(),
    date_fin_prévue: z.string().datetime().optional()
  }),

  // Task
  createTask: z.object({
    titre: z.string().min(3, 'Titre requis'),
    description: z.string().optional(),
    projet_id: z.string().min(1, 'Projet requis'),
    statut: z.enum(['À faire', 'En cours', 'En attente', 'Terminée']).optional(),
    priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
    assigné_à: z.string().optional(),
    date_deadline: z.string().datetime().optional(),
    heures_estimées: z.number().positive().optional()
  }),

  updateTask: z.object({
    titre: z.string().min(3, 'Titre requis').optional(),
    description: z.string().optional(),
    statut: z.enum(['À faire', 'En cours', 'En attente', 'Terminée']).optional(),
    priorité: z.enum(['Basse', 'Moyenne', 'Haute', 'Critique']).optional(),
    assigné_à: z.string().optional(),
    date_deadline: z.string().datetime().optional(),
    heures_estimées: z.number().positive().optional(),
    heures_réelles: z.number().min(0).optional()
  }),

  // Comment
  createComment: z.object({
    contenu: z.string().min(1, 'Commentaire requis'),
    entity_type: z.enum(['task', 'project', 'deliverable']),
    entity_id: z.string().min(1, 'ID entité requis')
  }),

  // File
  createFile: z.object({
    nom: z.string().min(1, 'Nom requis'),
    type: z.string().optional(),
    entity_type: z.enum(['project', 'task', 'comment']),
    entity_id: z.string().min(1, 'ID entité requis')
  }),

  // Pagination
  pagination: z.object({
    limit: z.number().min(1).max(200).default(50),
    page: z.number().min(1).default(1)
  }),

  // Search/Filter
  projectFilter: z.object({
    statut: z.string().optional(),
    priorité: z.string().optional(),
    archivé: z.boolean().optional()
  }),

  taskFilter: z.object({
    statut: z.string().optional(),
    priorité: z.string().optional(),
    assigné_à: z.string().optional(),
    projet_id: z.string().optional()
  })
};

// Helper pour valider les données
export async function validateInput(data, schema) {
  try {
    return {
      success: true,
      data: await schema.parseAsync(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors?.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    };
  }
}

// Middleware pour valider le body des requêtes
export async function validateRequestBody(request, schema) {
  try {
    const body = await request.json();
    return validateInput(body, schema);
  } catch (error) {
    return {
      success: false,
      error: [{ field: 'body', message: 'JSON invalide' }]
    };
  }
}
