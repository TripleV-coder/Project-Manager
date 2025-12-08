import mongoose from 'mongoose';

const deliverableSchema = new mongoose.Schema({
  projet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type_id: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliverableType', required: true },
  
  nom: { type: String, required: true },
  description: String,
  
  // Métadonnées dynamiques basées sur type
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  
  // Workflow
  statut_global: {
    type: String,
    enum: ['À produire', 'En validation', 'Validé', 'Refusé', 'Archivé'],
    default: 'À produire'
  },
  étape_actuelle_id: String,
  étape_actuelle_ordre: Number,
  
  historique_workflow: [{
    étape_id: String,
    étape_nom: String,
    action: { type: String, enum: ['validé', 'refusé', 'demande_modification'] },
    commentaire: String,
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now },
    fichiers_joints: [String]
  }],
  
  // Assignation
  assigné_à: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Dates
  date_échéance: Date,
  date_validation: Date,
  date_archivage: Date,
  
  // Signature électronique
  signatures: [{
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
    signature_data: String,
    ip_address: String
  }],
  
  // Fichiers
  fichiers: [{
    nom: String,
    url: String,
    taille: Number,
    type: String,
    uploadé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date_upload: { type: Date, default: Date.now }
  }],
  
  créé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

deliverableSchema.index({ projet_id: 1, statut_global: 1 });
deliverableSchema.index({ type_id: 1 });
deliverableSchema.index({ assigné_à: 1 });
deliverableSchema.index({ date_échéance: 1 });

export default mongoose.models.Deliverable || mongoose.model('Deliverable', deliverableSchema);
