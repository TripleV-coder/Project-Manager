import Joi from 'joi';

// User creation validation
export const userValidation = Joi.object({
  nom_complet: Joi.string().min(3).max(100).required().messages({
    'string.empty': 'Le nom complet est requis',
    'string.min': 'Le nom doit contenir au moins 3 caractères',
    'string.max': 'Le nom ne peut pas dépasser 100 caractères'
  }),
  email: Joi.string().email().required().messages({
    'string.empty': 'L\'email est requis',
    'string.email': 'Email invalide'
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.empty': 'Le mot de passe est requis',
      'string.min': 'Le mot de passe doit contenir au moins 8 caractères',
      'string.pattern.base': 'Le mot de passe doit contenir: majuscule, minuscule, chiffre et caractère spécial'
    }),
  role: Joi.string().valid('super_admin', 'admin', 'chef_projet', 'responsable_equipe', 'developpeur_senior', 'developpeur', 'testeur_qa', 'observateur').optional()
});

// Project creation validation - aligned with Project model schema
export const projectValidation = Joi.object({
  nom: Joi.string().min(3).max(200).required().messages({
    'string.empty': 'Le nom du projet est requis',
    'string.min': 'Le nom doit contenir au moins 3 caractères'
  }),
  description: Joi.string().max(2000).optional().allow(''),
  template_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.empty': 'Le template est requis',
    'any.required': 'Le template est requis',
    'string.pattern.base': 'ID template invalide'
  }),
  // Date fields - match model field names (French with accents)
  date_début: Joi.date().optional().allow('', null).messages({
    'date.base': 'Date de début invalide'
  }),
  date_fin_prévue: Joi.date().optional().allow('', null).messages({
    'date.base': 'Date de fin prévue invalide'
  }),
  chef_projet: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
    'string.pattern.base': 'ID chef de projet invalide'
  }),
  product_owner: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().messages({
    'string.pattern.base': 'ID product owner invalide'
  }),
  // Priorité - aligned with model enum
  priorité: Joi.string().valid('Basse', 'Moyenne', 'Haute', 'Critique').optional(),
  // Statut - aligned with model enum (French with capitals)
  statut: Joi.string().valid('Planification', 'En cours', 'En pause', 'Terminé', 'Annulé').optional()
});

// Task creation validation - aligned with Task model schema
export const taskValidation = Joi.object({
  titre: Joi.string().min(3).max(200).required().messages({
    'string.empty': 'Le titre est requis',
    'string.min': 'Le titre doit contenir au moins 3 caractères'
  }),
  description: Joi.string().max(5000).optional().allow(''),
  projet_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
    'string.empty': 'Le projet est requis',
    'string.pattern.base': 'ID projet invalide'
  }),
  // Type - aligned with model enum
  type: Joi.string().valid('Épic', 'Story', 'Tâche', 'Bug').default('Tâche'),
  // Assignation - French field name to match model
  assigné_à: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null),
  // Priorité - aligned with model enum (French with capitals)
  priorité: Joi.string().valid('Basse', 'Moyenne', 'Haute', 'Critique').default('Moyenne'),
  // Statut - aligned with model enum (French with capitals)
  statut: Joi.string().valid('Backlog', 'À faire', 'En cours', 'Review', 'Terminé').default('Backlog'),
  // Dates - French field names to match model
  date_début: Joi.date().optional().allow(null),
  date_échéance: Joi.date().optional().allow(null),
  // Sprint and deliverable
  sprint_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null),
  deliverable_id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().allow(null),
  // Estimation
  story_points: Joi.number().integer().min(0).max(100).optional(),
  estimation_heures: Joi.number().min(0).optional(),
  // Labels and tags
  labels: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional()
});

// Generic validate function
export function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.reduce((acc, detail) => {
      acc[detail.path[0]] = detail.message;
      return acc;
    }, {});

    throw {
      status: 400,
      errors,
      message: 'Validation échouée'
    };
  }

  return value;
}

// MongoDB ObjectId validation
export function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Sanitize query to prevent NoSQL injection
export function sanitizeQuery(query) {
  if (typeof query !== 'object' || query === null) return query;

  const sanitized = {};
  for (const [key, value] of Object.entries(query)) {
    // Block dangerous MongoDB operators
    if (key.startsWith('$')) continue;

    // Recursive for nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuery(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
