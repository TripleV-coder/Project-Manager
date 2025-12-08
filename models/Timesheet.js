import mongoose from 'mongoose';

const timesheetEntrySchema = new mongoose.Schema({
  utilisateur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  
  date: { type: Date, required: true },
  heures: { type: Number, required: true, min: 0, max: 24 },
  description: String,
  
  // Type de saisie
  type_saisie: {
    type: String,
    enum: ['manuelle', 'timer'],
    default: 'manuelle'
  },
  
  // Timer data
  timer_start: Date,
  timer_end: Date,
  timer_pauses: [{
    start: Date,
    end: Date,
    durée_minutes: Number
  }],
  
  // Validation workflow
  statut: {
    type: String,
    enum: ['brouillon', 'soumis', 'validé', 'refusé'],
    default: 'brouillon'
  },
  validé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date_validation: Date,
  commentaire_validation: String,
  
  // Facturation
  facturable: { type: Boolean, default: true },
  taux_horaire: Number,
  montant: Number,
  facturé: { type: Boolean, default: false },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

timesheetEntrySchema.index({ utilisateur: 1, date: 1 });
timesheetEntrySchema.index({ projet_id: 1, date: 1 });
timesheetEntrySchema.index({ task_id: 1 });
timesheetEntrySchema.index({ statut: 1 });

export default mongoose.models.TimesheetEntry || mongoose.model('TimesheetEntry', timesheetEntrySchema);
