import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true },
  description: String,
  is_custom: { type: Boolean, default: false },
  is_predefined: { type: Boolean, default: false },
  
  // 23 permissions atomiques (camelCase)
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
  
  // Contrôle menus visibles (camelCase)
  visibleMenus: {
    portfolio: { type: Boolean, default: true },
    projects: { type: Boolean, default: true },
    kanban: { type: Boolean, default: true },
    backlog: { type: Boolean, default: true },
    sprints: { type: Boolean, default: true },
    roadmap: { type: Boolean, default: true },
    tasks: { type: Boolean, default: true },
    files: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    timesheets: { type: Boolean, default: true },
    budget: { type: Boolean, default: true },
    reports: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    admin: { type: Boolean, default: false }
  },
  
  created_at: { type: Date, default: Date.now }
});

export default mongoose.models.Role || mongoose.model('Role', roleSchema);
