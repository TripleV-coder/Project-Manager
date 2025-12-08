import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  nom_complet: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
  status: { type: String, enum: ['Actif', 'Désactivé'], default: 'Actif' },
  first_login: { type: Boolean, default: true },
  must_change_password: { type: Boolean, default: true },
  
  // Profil utilisateur
  avatar: String,
  poste_titre: String,
  département_équipe: String,
  compétences: [String],
  disponibilité_hebdo: { type: Number, default: 35 },
  taux_journalier: Number,
  fuseau_horaire: { type: String, default: 'Europe/Paris' },
  notifications_préférées: {
    email: { type: Boolean, default: true },
    in_app: { type: Boolean, default: true },
    push: { type: Boolean, default: false }
  },
  signature_email: String,
  
  // Statistiques
  dernière_connexion: Date,
  projets_assignés: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
  
  // Historique mots de passe (pour empêcher réutilisation)
  password_history: [{ hash: String, date: Date }],
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

userSchema.index({ email: 1 });
userSchema.index({ role_id: 1 });
userSchema.index({ status: 1 });

export default mongoose.models.User || mongoose.model('User', userSchema);
