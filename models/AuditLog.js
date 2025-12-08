import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // Utilisateur
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  utilisateur_email: String,
  utilisateur_nom: String,
  
  // Action
  action: { 
    type: String, 
    enum: [
      'connexion',
      'd\u00e9connexion',
      'cr\u00e9ation',
      'modification',
      'suppression',
      'consultation',
      'validation',
      'refus',
      'assignation',
      'changement_statut',
      'upload_fichier',
      'download_fichier',
      'autre'
    ],
    required: true 
  },
  
  // Entité concernée
  entity_type: { 
    type: String, 
    required: true 
  },
  entity_id: mongoose.Schema.Types.ObjectId,
  entity_nom: String,
  
  // Détails
  description: String,
  old_value: mongoose.Schema.Types.Mixed,
  new_value: mongoose.Schema.Types.Mixed,
  
  // Contexte technique
  ip_address: String,
  user_agent: String,
  session_id: String,
  
  // Métadonnées
  metadata: mongoose.Schema.Types.Mixed,
  
  // Niveau de sévérité
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  
  timestamp: { type: Date, default: Date.now, index: true }
});

auditLogSchema.index({ utilisateur: 1, timestamp: -1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ ip_address: 1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
