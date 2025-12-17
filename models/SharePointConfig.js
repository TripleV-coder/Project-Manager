import mongoose from 'mongoose';

const SharePointConfigSchema = new mongoose.Schema({
  // Configuration unique (singleton)
  _id: {
    type: String,
    default: 'sharepoint_config'
  },

  // Activation
  enabled: {
    type: Boolean,
    default: false
  },

  // Identifiants Azure AD
  tenant_id: {
    type: String,
    default: ''
  },
  client_id: {
    type: String,
    default: ''
  },
  client_secret: {
    type: String,
    default: '',
    select: false // Ne pas retourner par défaut pour sécurité
  },
  site_id: {
    type: String,
    default: ''
  },

  // Configuration de synchronisation
  sync_enabled: {
    type: Boolean,
    default: false
  },
  sync_interval: {
    type: Number,
    default: 60, // minutes
    min: 5,
    max: 1440 // 24 heures
  },

  // Statut de connexion
  connection_status: {
    connected: { type: Boolean, default: false },
    last_test: { type: Date },
    last_error: { type: String },
    site_name: { type: String },
    site_url: { type: String }
  },

  // Statistiques de synchronisation
  sync_stats: {
    last_sync: { type: Date },
    files_synced: { type: Number, default: 0 },
    files_failed: { type: Number, default: 0 },
    total_size: { type: Number, default: 0 },
    errors: [{
      date: Date,
      file_name: String,
      error: String
    }]
  },

  // Métadonnées
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false,
  timestamps: false
});

// Méthode statique pour obtenir la configuration (singleton)
SharePointConfigSchema.statics.getConfig = async function(includeSecret = false) {
  let config = await this.findById('sharepoint_config');

  if (!config) {
    config = await this.create({ _id: 'sharepoint_config' });
  }

  if (includeSecret) {
    config = await this.findById('sharepoint_config').select('+client_secret');
  }

  return config;
};

// Méthode statique pour mettre à jour la configuration
SharePointConfigSchema.statics.updateConfig = async function(data, userId) {
  const updateData = {
    ...data,
    updated_by: userId,
    updated_at: new Date()
  };

  const config = await this.findByIdAndUpdate(
    'sharepoint_config',
    updateData,
    { new: true, upsert: true, runValidators: true }
  );

  return config;
};

// Méthode pour vérifier si SharePoint est configuré
SharePointConfigSchema.statics.isConfigured = async function() {
  const config = await this.findById('sharepoint_config').select('+client_secret');

  if (!config) return false;

  return !!(
    config.enabled &&
    config.tenant_id &&
    config.client_id &&
    config.client_secret &&
    config.site_id
  );
};

// Méthode pour mettre à jour le statut de connexion
SharePointConfigSchema.statics.updateConnectionStatus = async function(status) {
  return this.findByIdAndUpdate(
    'sharepoint_config',
    {
      connection_status: {
        ...status,
        last_test: new Date()
      },
      updated_at: new Date()
    },
    { new: true }
  );
};

// Méthode pour mettre à jour les stats de sync
SharePointConfigSchema.statics.updateSyncStats = async function(stats) {
  const config = await this.findById('sharepoint_config');

  const errors = stats.errors || [];
  const existingErrors = config?.sync_stats?.errors || [];

  // Garder seulement les 50 dernières erreurs
  const allErrors = [...errors.map(e => ({ ...e, date: new Date() })), ...existingErrors].slice(0, 50);

  return this.findByIdAndUpdate(
    'sharepoint_config',
    {
      sync_stats: {
        last_sync: new Date(),
        files_synced: (config?.sync_stats?.files_synced || 0) + (stats.files_synced || 0),
        files_failed: (config?.sync_stats?.files_failed || 0) + (stats.files_failed || 0),
        total_size: stats.total_size || config?.sync_stats?.total_size || 0,
        errors: allErrors
      },
      updated_at: new Date()
    },
    { new: true }
  );
};

export default mongoose.models.SharePointConfig || mongoose.model('SharePointConfig', SharePointConfigSchema);
