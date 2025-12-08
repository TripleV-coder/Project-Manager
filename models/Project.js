import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  description: String,
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectTemplate', required: true },
  
  // Champs dynamiques basés sur template
  champs_dynamiques: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  statut: { 
    type: String, 
    enum: ['Planification', 'En cours', 'En pause', 'Terminé', 'Annulé'],
    default: 'Planification'
  },
  priorité: {
    type: String,
    enum: ['Basse', 'Moyenne', 'Haute', 'Critique'],
    default: 'Moyenne'
  },
  
  // Dates
  date_début: Date,
  date_fin_prévue: Date,
  date_fin_réelle: Date,
  
  // Équipe
  chef_projet: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  membres: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rôle_projet: String,
    date_ajout: { type: Date, default: Date.now }
  }],
  
  // Budget
  budget: {
    prévisionnel: { type: Number, default: 0 },
    réel: { type: Number, default: 0 },
    devise: { type: String, default: 'FCFA' },
    catégories: [{
      nom: String,
      montant_prévu: Number,
      montant_dépensé: Number
    }]
  },
  
  // Configuration Kanban
  colonnes_kanban: [{
    id: String,
    nom: String,
    couleur: String,
    wip_limit: Number,
    ordre: Number
  }],
  
  // SharePoint
  sharepoint_config: {
    enabled: { type: Boolean, default: false },
    site_id: String,
    folder_path: String,
    last_sync: Date
  },
  
  // Statistiques
  stats: {
    total_tâches: { type: Number, default: 0 },
    tâches_terminées: { type: Number, default: 0 },
    heures_estimées: { type: Number, default: 0 },
    heures_réelles: { type: Number, default: 0 },
    progression: { type: Number, default: 0 }
  },
  
  créé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  archivé: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.models.Project || mongoose.model('Project', projectSchema);
