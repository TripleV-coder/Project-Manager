import Timesheet from '@/models/Timesheet'
import Task from '@/models/Task'
import Project from '@/models/Project'
import connectDB from '@/lib/mongodb'

class TimesheetService {
  async getUserTimesheets(userId, dateStart, dateEnd, limit = 50, skip = 0) {
    await connectDB()

    const query = {
      utilisateur: userId,
      date: { $gte: dateStart, $lte: dateEnd }
    }

    const [timesheets, total] = await Promise.all([
      Timesheet.find(query)
        .populate('utilisateur', 'nom_complet')
        .populate('task_id', 'titre')
        .populate('sprint_id', 'nom')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Timesheet.countDocuments(query)
    ])

    return { timesheets, total }
  }

  async getProjectTimesheets(projectId, dateStart, dateEnd) {
    await connectDB()

    return Timesheet.find({
      projet_id: projectId,
      date: { $gte: dateStart, $lte: dateEnd }
    })
      .populate('utilisateur', 'nom_complet')
      .populate('task_id', 'titre')
      .sort({ date: -1 })
      .lean()
  }

  async createTimesheet(data, userId) {
    await connectDB()

    const project = await Project.findById(data.projet_id).select('_id').lean()
    if (!project) throw new Error('Projet non trouvé')

    const timesheet = new Timesheet({
      utilisateur: userId,
      projet_id: data.projet_id,
      task_id: data.task_id,
      sprint_id: data.sprint_id,
      date: data.date,
      heures: data.heures,
      description: data.description,
      type_saisie: data.type_saisie || 'manuelle',
      statut: 'brouillon'
    })

    await timesheet.save()
    await timesheet.populate('utilisateur', 'nom_complet')
    await timesheet.populate('task_id', 'titre')

    return timesheet.toObject()
  }

  async updateTimesheet(timesheetId, data) {
    await connectDB()

    return Timesheet.findByIdAndUpdate(
      timesheetId,
      { ...data, updated_at: new Date() },
      { new: true, runValidators: true }
    )
      .populate('utilisateur', 'nom_complet')
      .populate('task_id', 'titre')
      .lean()
  }

  async submitTimesheet(timesheetId) {
    await connectDB()

    return Timesheet.findByIdAndUpdate(
      timesheetId,
      { statut: 'soumis' },
      { new: true }
    ).lean()
  }

  async validateTimesheet(timesheetId, validatedBy, approved = true, comment = '') {
    await connectDB()

    const timesheet = await Timesheet.findByIdAndUpdate(
      timesheetId,
      {
        statut: approved ? 'validé' : 'refusé',
        validé_par: validatedBy,
        date_validation: new Date(),
        commentaire_validation: comment
      },
      { new: true }
    ).lean()

    if (approved && timesheet.task_id) {
      await Task.findByIdAndUpdate(
        timesheet.task_id,
        { $inc: { temps_réel: timesheet.heures } }
      )
    }

    return timesheet
  }

  async getUserTimesheetStats(userId, dateStart, dateEnd) {
    await connectDB()

    const timesheets = await Timesheet.find({
      utilisateur: userId,
      date: { $gte: dateStart, $lte: dateEnd }
    }).lean()

    const validated = timesheets.filter(t => t.statut === 'validé')

    return {
      total_entries: timesheets.length,
      total_hours: timesheets.reduce((sum, t) => sum + (t.heures || 0), 0),
      validated_entries: validated.length,
      validated_hours: validated.reduce((sum, t) => sum + (t.heures || 0), 0),
      pending_entries: timesheets.filter(t => t.statut === 'soumis').length,
      rejected_entries: timesheets.filter(t => t.statut === 'refusé').length
    }
  }

  async getProjectTimesheetStats(projectId, dateStart, dateEnd) {
    await connectDB()

    const timesheets = await Timesheet.find({
      projet_id: projectId,
      date: { $gte: dateStart, $lte: dateEnd }
    }).lean()

    const validated = timesheets.filter(t => t.statut === 'validé')

    return {
      total_hours: timesheets.reduce((sum, t) => sum + (t.heures || 0), 0),
      validated_hours: validated.reduce((sum, t) => sum + (t.heures || 0), 0),
      billable_hours: validated.filter(t => t.facturable).reduce((sum, t) => sum + (t.heures || 0), 0),
      unique_users: new Set(timesheets.map(t => t.utilisateur.toString())).size,
      entries_count: timesheets.length
    }
  }

  async deleteTimesheet(timesheetId) {
    await connectDB()

    const timesheet = await Timesheet.findById(timesheetId)
    if (!timesheet) return null

    if (timesheet.statut === 'validé' && timesheet.task_id) {
      await Task.findByIdAndUpdate(
        timesheet.task_id,
        { $inc: { temps_réel: -timesheet.heures } }
      )
    }

    await Timesheet.findByIdAndDelete(timesheetId)
    return timesheet
  }
}

export default new TimesheetService()
