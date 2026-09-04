import mongoose from 'mongoose';
import connectDB from './db';

/**
 * Execute operation with transaction
 * @param {Function} operation - Async function receiving session
 * @returns {Promise<any>}
 */
export async function withTransaction(operation) {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const result = await operation(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    console.error('[Transaction] Failed and rolled back:', error);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Create project with team members (atomic transaction)
 */
export async function createProjectWithTeam(projectData, memberIds, userId) {
  return withTransaction(async (session) => {
    const Project = mongoose.model('Project');
    const User = mongoose.model('User');
    const Notification = mongoose.model('Notification');

    const ProjectRole = mongoose.model('ProjectRole');

    const defaultRole = await ProjectRole.findOne({ nom: 'Membre' }).session(session);
    if (!defaultRole) {
      throw new Error('Default "Membre" role not found');
    }

    const [project] = await Project.create(
      [
        {
          ...projectData,
          membres: memberIds.map((id) => ({
            user_id: id,
            project_role_id: defaultRole._id,
            date_ajout: new Date(),
          })),
          chef_projet: userId,
        },
      ],
      { session }
    );

    await User.updateMany(
      { _id: { $in: memberIds } },
      { $push: { projets_assignés: project._id } },
      { session }
    );

    await Notification.insertMany(
      memberIds.map((memberId) => ({
        destinataire: memberId,
        type: 'ajout_projet',
        entity_type: 'projet',
        entity_id: project._id,
        entity_nom: project.nom,
        titre: 'Nouveau projet',
        message: `Vous avez été ajouté au projet "${project.nom}"`,
        expéditeur: userId,
      })),
      { session }
    );

    return project;
  });
}

/**
 * Move task to sprint (atomic transaction)
 */
export async function moveTaskToSprint(taskId, sprintId, _userId) {
  return withTransaction(async (session) => {
    const Task = mongoose.model('Task');
    const Sprint = mongoose.model('Sprint');

    const sprint = await Sprint.findById(sprintId).session(session);
    if (!sprint) {
      throw new Error('Sprint not found');
    }

    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        sprint_id: sprintId,
        statut: 'À faire',
      },
      { session, new: true }
    );

    if (!task) {
      throw new Error('Task not found');
    }

    await Sprint.findByIdAndUpdate(
      sprintId,
      { $inc: { story_points_planifiés: task.story_points || 0 } },
      { session }
    );

    return task;
  });
}

/**
 * Complete multiple tasks at once (atomic)
 */
export async function completeTasksBatch(taskIds) {
  return withTransaction(async (session) => {
    const Task = mongoose.model('Task');

    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      { $set: { statut: 'Terminé' } },
      { session }
    );

    return result;
  });
}

/**
 * Update project status with all related updates (atomic)
 */
export async function updateProjectStatus(projectId, newStatus) {
  return withTransaction(async (session) => {
    const Project = mongoose.model('Project');
    const Task = mongoose.model('Task');

    const project = await Project.findByIdAndUpdate(
      projectId,
      { statut: newStatus },
      { session, new: true }
    );

    if (!project) {
      throw new Error('Project not found');
    }

    if (newStatus === 'Terminé') {
      await Task.updateMany(
        {
          projet_id: projectId,
          statut: { $ne: 'Terminé' },
        },
        { $set: { statut: 'Terminé' } },
        { session }
      );
    }

    return project;
  });
}
