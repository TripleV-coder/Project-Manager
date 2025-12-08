import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema({
  projet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  
  catégorie: { type: String, required: true },
  description: { type: String, required: true },
  montant: { type: Number, required: true },
  devise: { type: String, default: 'FCFA' },
  
  // Type de dépense
  type: {
    type: String,
    enum: ['interne', 'externe', 'matériel', 'service', 'autre'],
    default: 'externe'
  },
  
  date_dépense: { type: Date, required: true },
  
  // Fournisseur
  fournisseur: String,
  numéro_facture: String,
  
  // Justificatifs
  justificatifs: [{
    nom: String,
    url: String,
    taille: Number,
    type: String,
    date_upload: { type: Date, default: Date.now }
  }],
  
  // Validation
  statut: {
    type: String,
    enum: ['en_attente', 'validé', 'refusé', 'payé'],
    default: 'en_attente'
  },
  validé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date_validation: Date,
  
  saisi_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

expenseSchema.index({ projet_id: 1, date_dépense: 1 });
expenseSchema.index({ catégorie: 1 });
expenseSchema.index({ statut: 1 });

export default mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
