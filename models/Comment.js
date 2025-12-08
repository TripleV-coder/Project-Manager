import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  // Contexte
  entity_type: { 
    type: String, 
    enum: ['projet', 't\u00e2che', 'livrable', 'sprint'],
    required: true 
  },
  entity_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  
  // Contenu
  contenu: { type: String, required: true },
  contenu_html: String, // Version rich text
  
  // Auteur
  auteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Threading
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
  niveau: { type: Number, default: 0 }, // Profondeur de nesting
  thread_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }, // Commentaire racine
  
  // @mentions
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Pièces jointes
  fichiers_joints: [{
    nom: String,
    url: String,
    taille: Number,
    type: String
  }],
  
  // Réactions
  reactions: [{
    utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry'] },
    date: { type: Date, default: Date.now }
  }],
  
  // Statut
  édité: { type: Boolean, default: false },
  date_édition: Date,
  supprimé: { type: Boolean, default: false },
  résolu: { type: Boolean, default: false },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

commentSchema.index({ entity_type: 1, entity_id: 1, created_at: -1 });
commentSchema.index({ auteur: 1 });
commentSchema.index({ parent_id: 1 });
commentSchema.index({ thread_id: 1 });
commentSchema.index({ mentions: 1 });

export default mongoose.models.Comment || mongoose.model('Comment', commentSchema);
