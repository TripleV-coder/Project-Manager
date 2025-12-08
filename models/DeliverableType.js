import mongoose from 'mongoose';

const étapeWorkflowSchema = new mongoose.Schema({
  id: String,
  nom: { type: String, required: true },
  description: String,
  ordre: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['Création', 'Révision', 'Approbation', 'Signature', 'Archivage'],
    required: true 
  },
  approbateurs: [{
    type: { type: String, enum: ['rôle', 'utilisateur'] },
    rôle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  délai_max_jours: Number,
  conditions: mongoose.Schema.Types.Mixed,
  routing: { type: String, enum: ['séquentiel', 'parallèle'], default: 'séquentiel' }
});

const deliverableTypeSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  description: String,
  icône: String,
  couleur: String,
  
  // Hiérarchie
  scope: { 
    type: String, 
    enum: ['global', 'template', 'projet'],
    default: 'global'
  },
  template_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectTemplate' },
  projet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  
  // Workflow de validation
  workflow_enabled: { type: Boolean, default: true },
  étapes_workflow: [étapeWorkflowSchema],
  
  // Métadonnées personnalisées (même structure que project fields)
  champs_metadata: [{
    id: String,
    type: String,
    label: String,
    required: Boolean,
    properties: mongoose.Schema.Types.Mixed
  }],
  
  // Dépendances
  livrables_prérequis: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliverableType' }],
  
  // Signature électronique
  signature_required: { type: Boolean, default: false },
  
  créé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

deliverableTypeSchema.index({ nom: 1 });
deliverableTypeSchema.index({ scope: 1 });
deliverableTypeSchema.index({ template_id: 1 });
deliverableTypeSchema.index({ projet_id: 1 });

export default mongoose.models.DeliverableType || mongoose.model('DeliverableType', deliverableTypeSchema);
