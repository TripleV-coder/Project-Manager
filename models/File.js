import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  nom_original: { type: String, required: true },
  extension: String,
  taille: { type: Number, required: true }, // en bytes
  type_mime: String,
  type: String, // Alias for type_mime (API compatibility)
  url: String, // Data URL or storage URL (API compatibility)

  // Dossier/folder support
  dossier: { type: String, default: '/' },

  // Stockage local
  url_local: String,
  path_local: String,
  
  // SharePoint metadata (si syncé)
  sharepoint_id: String,
  sharepoint_url: String,
  sharepoint_synced: { type: Boolean, default: false },
  last_sync_sharepoint: Date,
  
  // Contexte
  entity_type: { type: String, required: true }, // projet, tâche, livrable, commentaire
  entity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  projet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Direct project reference (API compatibility)

  // Utilisateur
  uploadé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Versioning
  version: { type: Number, default: 1 },
  parent_file_id: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  is_latest_version: { type: Boolean, default: true },
  
  // Métadonnées
  description: String,
  tags: [String],
  
  // Preview
  has_preview: { type: Boolean, default: false },
  preview_url: String,
  thumbnail_url: String,
  
  // Téléchargements
  download_count: { type: Number, default: 0 },
  last_downloaded: Date,
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

fileSchema.index({ entity_type: 1, entity_id: 1 });
fileSchema.index({ uploadé_par: 1 });
fileSchema.index({ nom: 'text', description: 'text' });
fileSchema.index({ sharepoint_id: 1 });
fileSchema.index({ parent_file_id: 1, version: -1 });

export default mongoose.models.File || mongoose.model('File', fileSchema);
