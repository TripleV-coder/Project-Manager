import mongoose from 'mongoose';

const userSessionSchema = new mongoose.Schema({
  // User reference
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  utilisateur_email: { type: String, index: true },
  utilisateur_nom: String,
  
  // Session info
  session_token: { type: String, unique: true, index: true },
  
  // Login details
  login_time: { type: Date, default: Date.now, index: true },
  logout_time: Date,
  duration_minutes: Number,
  
  // Device & Location
  ip_address: { type: String, index: true },
  ip_country: String,
  ip_city: String,
  ip_latitude: Number,
  ip_longitude: Number,
  
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
  
  // Connection details
  type_connexion: {
    type: String,
    enum: ['local', 'oauth', 'saml', 'token'],
    default: 'local'
  },
  
  // Status
  statut: {
    type: String,
    enum: ['actif', 'inactif', 'expiré', 'révoqué'],
    default: 'actif'
  },
  
  // Security
  is_secure: { type: Boolean, default: false },
  is_suspicious: { type: Boolean, default: false },
  anomalies: [String],
  
  // Actions during session
  actions_count: { type: Number, default: 0 },
  last_activity: Date,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  created_at: { type: Date, default: Date.now, index: true },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

userSessionSchema.index({ utilisateur: 1, login_time: -1 });
userSessionSchema.index({ ip_address: 1, login_time: -1 });
userSessionSchema.index({ created_at: -1 });
userSessionSchema.index({ statut: 1 });

export default mongoose.models.UserSession || mongoose.model('UserSession', userSessionSchema);
