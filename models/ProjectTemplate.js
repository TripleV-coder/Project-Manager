import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  id: String,
  type: { 
    type: String, 
    enum: ['texte', 'nombre', 'date', 'sélecteur', 'utilisateur', 'fichier', 'budget', 'url'],
    required: true 
  },
  label: { type: String, required: true },
  required: { type: Boolean, default: false },
  placeholder: String,
  default_value: mongoose.Schema.Types.Mixed,
  
  // Propriétés spécifiques par type
  properties: {
    // Pour texte
    variant: String, // court, long, riche, code
    longueur_max: Number,
    pattern: String,
    
    // Pour nombre
    min: Number,
    max: Number,
    step: Number,
    unité: String,
    format: String, // entier, décimal, monétaire, pourcentage
    
    // Pour date
    date_min: Date,
    date_max: Date,
    format_date: String,
    aujourdhui_par_defaut: Boolean,
    
    // Pour sélecteur
    options: [String],
    recherchable: Boolean,
    créable: Boolean,
    multiple: Boolean,
    
    // Pour utilisateur
    filtre_rôle: String,
    filtre_équipe: String,
    multiple_users: Boolean,
    
    // Pour fichier
    types_autorisés: [String],
    taille_max: Number,
    multiple_files: Boolean,
    max_fichiers: Number
  },
  
  // Logique conditionnelle
  conditional_logic: {
    enabled: { type: Boolean, default: false },
    show_if: mongoose.Schema.Types.Mixed,
    require_if: mongoose.Schema.Types.Mixed
  },
  
  // Grouping
  group: String,
  order: { type: Number, default: 0 }
});

const projectTemplateSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  description: String,
  catégorie: String,
  tags: [String],
  icône: String,
  couleur: String,
  
  // Structure des champs dynamiques
  champs: [fieldSchema],
  
  // Configuration workflow
  config_workflow: {
    étapes_par_défaut: [String],
    livrables_auto: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliverableType' }],
    notifications_auto: Boolean
  },
  
  // Statistiques
  utilisé_count: { type: Number, default: 0 },
  favoris: { type: Boolean, default: false },
  
  créé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Add indexes for performance
projectTemplateSchema.index({ créé_par: 1 });
projectTemplateSchema.index({ catégorie: 1 });
projectTemplateSchema.index({ utilisé_count: -1 });
projectTemplateSchema.index({ favoris: 1 });
projectTemplateSchema.index({ created_at: -1 });

export default mongoose.models.ProjectTemplate || mongoose.model('ProjectTemplate', projectTemplateSchema);
