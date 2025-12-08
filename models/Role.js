import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true },
  description: String,
  is_custom: { type: Boolean, default: false },
  is_predefined: { type: Boolean, default: false },
  
  // 22 permissions atomiques
  permissions: {
    voir_tous_projets: { type: Boolean, default: false },
    voir_ses_projets: { type: Boolean, default: true },
    créer_projet: { type: Boolean, default: false },
    supprimer_projet: { type: Boolean, default: false },
    modifier_charte_projet: { type: Boolean, default: false },
    gérer_membres_projet: { type: Boolean, default: false },
    changer_rôle_membre: { type: Boolean, default: false },
    gérer_tâches: { type: Boolean, default: false },
    déplacer_tâches: { type: Boolean, default: true },
    prioriser_backlog: { type: Boolean, default: false },
    gérer_sprints: { type: Boolean, default: false },
    modifier_budget: { type: Boolean, default: false },
    voir_budget: { type: Boolean, default: false },
    voir_temps_passés: { type: Boolean, default: false },
    saisir_temps: { type: Boolean, default: true },
    valider_livrable: { type: Boolean, default: false },
    gérer_fichiers: { type: Boolean, default: true },
    commenter: { type: Boolean, default: true },
    recevoir_notifications: { type: Boolean, default: true },
    générer_rapports: { type: Boolean, default: false },
    voir_audit: { type: Boolean, default: false },
    admin_config: { type: Boolean, default: false }
  },
  
  // Contrôle menus visibles
  visible_menus: {
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
  
  created_at: { type: Date, default: Date.now }
});

export default mongoose.models.Role || mongoose.model('Role', roleSchema);
