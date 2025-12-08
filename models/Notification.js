import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  destinataire: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  type: {
    type: String,
    enum: [
      'mention',
      'assignation_t\u00e2che',
      'commentaire',
      'changement_statut',
      'nouveau_livrable',
      'validation_requise',
      'deadline_proche',
      'budget_d\u00e9pass\u00e9',
      'ajout_projet',
      'sprint_d\u00e9marr\u00e9',
      'sprint_termin\u00e9',
      'autre'
    ],
    required: true
  },
  
  titre: { type: String, required: true },
  message: { type: String, required: true },
  
  // Contexte
  entity_type: String, // projet, t\u00e2che, livrable, etc.
  entity_id: mongoose.Schema.Types.ObjectId,
  entity_nom: String,
  
  // Lien action
  lien: String,
  
  // Expéditeur
  expéditeur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Statut
  lu: { type: Boolean, default: false },
  date_lecture: Date,
  archivé: { type: Boolean, default: false },
  
  // Canaux de livraison
  canaux: {
    in_app: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  
  email_envoyé: { type: Boolean, default: false },
  date_email: Date,
  
  created_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at' } });

notificationSchema.index({ destinataire: 1, lu: 0, created_at: -1 });
notificationSchema.index({ destinataire: 1, type: 1 });
notificationSchema.index({ entity_type: 1, entity_id: 1 });
notificationSchema.index({ created_at: -1 });

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
