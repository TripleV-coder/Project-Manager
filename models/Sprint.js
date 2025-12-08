import mongoose from 'mongoose';

const sprintSchema = new mongoose.Schema({
  projet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  nom: { type: String, required: true },
  objectif: String,
  
  statut: {
    type: String,
    enum: ['Planifié', 'Actif', 'Terminé'],
    default: 'Planifié'
  },
  
  // Dates
  date_début: { type: Date, required: true },
  date_fin: { type: Date, required: true },
  
  // Capacity planning
  capacité_équipe: { type: Number, default: 0 }, // en heures
  capacité_par_membre: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    heures_disponibles: Number
  }],
  
  // Metrics
  story_points_planifiés: { type: Number, default: 0 },
  story_points_complétés: { type: Number, default: 0 },
  velocity: { type: Number, default: 0 },
  
  // Burndown data
  burndown_data: [{
    date: Date,
    story_points_restants: Number,
    heures_restantes: Number,
    idéal: Number
  }],
  
  // Rétrospective
  retrospective: {
    ce_qui_a_bien_marché: [String],
    à_améliorer: [String],
    actions: [{
      description: String,
      responsable: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      statut: { type: String, enum: ['TODO', 'En cours', 'Fait'], default: 'TODO' }
    }]
  },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

sprintSchema.index({ projet_id: 1, statut: 1 });
sprintSchema.index({ date_début: 1, date_fin: 1 });

export default mongoose.models.Sprint || mongoose.model('Sprint', sprintSchema);
