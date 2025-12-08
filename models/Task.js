import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  projet_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  titre: { type: String, required: true },
  description: String,
  
  // Hiérarchie
  type: { type: String, enum: ['Épic', 'Story', 'Tâche', 'Bug'], default: 'Tâche' },
  parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  epic_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  
  // Statut et workflow
  statut: { 
    type: String, 
    enum: ['Backlog', 'À faire', 'En cours', 'Review', 'Terminé'],
    default: 'Backlog'
  },
  colonne_kanban: String,
  
  // Priorité et estimation
  priorité: { 
    type: String, 
    enum: ['Basse', 'Moyenne', 'Haute', 'Critique'],
    default: 'Moyenne'
  },
  ordre_priorité: { type: Number, default: 0 },
  story_points: Number,
  estimation_heures: Number,
  temps_réel: { type: Number, default: 0 },
  
  // Assignation
  assigné_à: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  créé_par: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Sprint
  sprint_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint' },
  
  // Dépendances
  dépendances: [{
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    type: { type: String, enum: ['bloque', 'bloqué_par', 'lié_à'] }
  }],
  
  // Labels et catégories
  labels: [String],
  tags: [String],
  
  // Checklist
  checklist: [{
    id: String,
    texte: String,
    complété: { type: Boolean, default: false },
    ordre: Number
  }],
  
  // Dates
  date_début: Date,
  date_échéance: Date,
  date_complétion: Date,
  
  // Critères d'acceptation
  acceptance_criteria: [String],
  
  // Possède sous-tâches
  has_subtasks: { type: Boolean, default: false },
  subtasks_count: { type: Number, default: 0 },
  subtasks_completed: { type: Number, default: 0 },
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

export default mongoose.models.Task || mongoose.model('Task', taskSchema);
