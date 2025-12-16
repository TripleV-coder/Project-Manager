import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  nom_complet: {
    type: String,
    required: [true, 'Le nom complet est requis'],
    trim: true,
    minlength: [3, 'Le nom doit contenir au moins 3 caractères'],
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  email: {
    type: String,
    required: [true, 'L\'email est requis'],
    unique: true, // unique: true already creates an index
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email invalide'
    }
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [8, 'Le mot de passe doit contenir au moins 8 caractères'],
    select: false // Never return password in queries
  },
  role_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  status: {
    type: String,
    enum: ['Actif', 'Désactivé', 'Suspendu'],
    default: 'Actif'
  },
  first_login: {
    type: Boolean,
    default: true
  },
  must_change_password: {
    type: Boolean,
    default: true
  },

  // User profile
  avatar: String,
  telephone: {
    type: String,
    trim: true
  },
  poste_titre: String,
  département_équipe: String,
  compétences: [String],
  disponibilité_hebdo: {
    type: Number,
    default: 35
  },
  taux_journalier: Number,
  fuseau_horaire: {
    type: String,
    default: 'Africa/Porto-Novo'
  },
  notifications_préférées: {
    email: { type: Boolean, default: true },
    in_app: { type: Boolean, default: true },
    push: { type: Boolean, default: false }
  },
  signature_email: String,

  // Statistics
  dernière_connexion: Date,
  projets_assignés: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],

  // Password history (prevent reuse)
  password_history: [{
    hash: String,
    date: Date
  }],

  // Security: Login attempt tracking
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },

  // Password reset
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },

  // Audit trail
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Text index for search
userSchema.index({ nom_complet: 'text', email: 'text' });
userSchema.index({ role_id: 1, status: 1 });

// Virtual: is account locked?
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Method: Increment failed login attempts
userSchema.methods.incLoginAttempts = function() {
  // Reset if lock expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { failedLoginAttempts: 1 } };

  // Lock after 5 failed attempts (15 minutes)
  if (this.failedLoginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 15 * 60 * 1000) };
  }

  return this.updateOne(updates);
};

// Method: Reset after successful login
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: {
      failedLoginAttempts: 0,
      dernière_connexion: new Date()
    },
    $unset: { lockUntil: 1 }
  });
};

export default mongoose.models.User || mongoose.model('User', userSchema);
