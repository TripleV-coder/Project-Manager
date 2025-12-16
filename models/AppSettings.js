import mongoose from 'mongoose';

const appSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true, // unique: true already creates an index
    enum: ['maintenance_mode', 'app_settings', 'feature_flags']
  },
  value: mongoose.Schema.Types.Mixed,
  description: String,
  updated_at: { type: Date, default: Date.now },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.models.AppSettings || mongoose.model('AppSettings', appSettingsSchema);
