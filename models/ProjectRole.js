import mongoose from 'mongoose';

const projectRoleSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  description: String,
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  is_custom: { type: Boolean, default: false },
  is_predefined: { type: Boolean, default: false },
  
  // 23 permissions atomiques (aligned with Role model)
  permissions: {
    voirTousProjets: { type: Boolean, default: false },
    voirSesProjets: { type: Boolean, default: true },
    creerProjet: { type: Boolean, default: false },
    supprimerProjet: { type: Boolean, default: false },
    modifierCharteProjet: { type: Boolean, default: false },
    gererMembresProjet: { type: Boolean, default: false },
    changerRoleMembre: { type: Boolean, default: false },
    gererTaches: { type: Boolean, default: false },
    deplacerTaches: { type: Boolean, default: true },
    prioriserBacklog: { type: Boolean, default: false },
    gererSprints: { type: Boolean, default: false },
    modifierBudget: { type: Boolean, default: false },
    voirBudget: { type: Boolean, default: false },
    voirTempsPasses: { type: Boolean, default: false },
    saisirTemps: { type: Boolean, default: true },
    validerLivrable: { type: Boolean, default: false },
    gererFichiers: { type: Boolean, default: true },
    commenter: { type: Boolean, default: true },
    recevoirNotifications: { type: Boolean, default: true },
    genererRapports: { type: Boolean, default: false },
    voirAudit: { type: Boolean, default: false },
    gererUtilisateurs: { type: Boolean, default: false },
    adminConfig: { type: Boolean, default: false }
  },
  
  // Menu visibility at project level
  visibleMenus: {
    portfolio: { type: Boolean, default: true },
    projects: { type: Boolean, default: true },
    kanban: { type: Boolean, default: true },
    backlog: { type: Boolean, default: false },
    sprints: { type: Boolean, default: false },
    roadmap: { type: Boolean, default: false },
    tasks: { type: Boolean, default: true },
    files: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    timesheets: { type: Boolean, default: true },
    budget: { type: Boolean, default: false },
    reports: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
    admin: { type: Boolean, default: false }
  },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Ensure one role name per project (prevent duplicates)
projectRoleSchema.index({ project_id: 1, nom: 1 }, { unique: true });
// Index pour recherche rapide des rôles d'un projet
projectRoleSchema.index({ project_id: 1, is_predefined: 1 });
projectRoleSchema.index({ project_id: 1, is_custom: 1 });

export default mongoose.models.ProjectRole || mongoose.model('ProjectRole', projectRoleSchema);
