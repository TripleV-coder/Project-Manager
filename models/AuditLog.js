import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  // User who performed the action
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  utilisateur_email: { type: String, index: true },
  utilisateur_nom: String,
  
  // Action type
  action: { 
    type: String, 
    enum: [
      'connexion',
      'déconnexion',
      'création',
      'modification',
      'suppression',
      'consultation',
      'validation',
      'refus',
      'assignation',
      'changement_statut',
      'upload_fichier',
      'download_fichier',
      'export',
      'import',
      'permission_change',
      'role_change',
      'password_reset',
      'password_change',
      'email_change',
      'login_failed',
      'access_denied',
      'bulk_action',
      'api_call',
      'autre'
    ],
    required: true,
    index: true
  },
  
  // Entity affected
  entity_type: { 
    type: String,
    index: true,
    required: true 
  },
  entity_id: { type: mongoose.Schema.Types.ObjectId, index: true },
  entity_nom: String,
  entity_properties: [String],
  
  // Details of changes
  description: String,
  old_value: mongoose.Schema.Types.Mixed,
  new_value: mongoose.Schema.Types.Mixed,
  changed_fields: [String],
  
  // Technical context
  ip_address: { type: String, index: true },
  ip_country: String,
  ip_city: String,
  user_agent: String,
  navigateur: String,
  navigateur_version: String,
  os: String,
  os_version: String,
  device_type: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  session_id: { type: String, index: true },
  
  // Request details
  http_method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    index: true
  },
  endpoint: String,
  http_status: Number,
  
  // Result
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success',
    index: true
  },
  error_message: String,
  
  // Security & Severity
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  },
  is_sensitive: { type: Boolean, default: false },
  is_suspicious: { type: Boolean, default: false },
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  duration_ms: Number,
  response_size_bytes: Number,
  
  // Related context
  related_user_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  related_project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
  
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: { createdAt: 'timestamp' } });

// Compound indexes for efficient queries
auditLogSchema.index({ utilisateur: 1, timestamp: -1 });
auditLogSchema.index({ entity_type: 1, entity_id: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ ip_address: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ utilisateur: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ result: 1, timestamp: -1 });
auditLogSchema.index({ session_id: 1, timestamp: -1 });

export default mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
