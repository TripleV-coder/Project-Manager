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

    // 1. Create project
    const [project] = await Project.create([{
      ...projectData,
      membres: memberIds.map(id => ({
        user: id,
        role: 'membre',
        date_ajout: new Date()
      })),
      createdBy: userId
    }], { session });

    // 2. Add project to users
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $push: { projets_assignés: project._id } },
      { session }
    );

    // 3. Create notifications
    await Notification.insertMany(
      memberIds.map(memberId => ({
        user: memberId,
        type: 'nouveau_projet',
        projet: project._id,
        titre: 'Nouveau projet',
        message: `Vous avez été ajouté au projet "${project.nom}"`,
        lu: false,
        createdBy: userId
      })),
      { session }
    );

    return project;
  });
}

/**
 * Move task to sprint (atomic transaction)
 */
export async function moveTaskToSprint(taskId, sprintId, userId) {
  return withTransaction(async (session) => {
    const Task = mongoose.model('Task');
    const Sprint = mongoose.model('Sprint');

    // 1. Update task
    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        sprint: sprintId,
        statut: 'en_cours',
        updatedBy: userId
      },
      { session, new: true }
    );

    if (!task) {
      throw new Error('Task not found');
    }

    // 2. Update sprint
    await Sprint.findByIdAndUpdate(
      sprintId,
      {
        $push: { taches: taskId },
        $inc: {
          total_story_points: task.story_points || 0,
          nombre_taches: 1
        }
      },
      { session }
    );

    return task;
  });
}

/**
 * Complete multiple tasks at once (atomic)
 */
export async function completeTasksBatch(taskIds, userId) {
  return withTransaction(async (session) => {
    const Task = mongoose.model('Task');

    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      {
        $set: {
          statut: 'terminee',
          updatedBy: userId,
          completed_at: new Date()
        }
      },
      { session }
    );

    return result;
  });
}

/**
 * Update project status with all related updates (atomic)
 */
export async function updateProjectStatus(projectId, newStatus, userId) {
  return withTransaction(async (session) => {
    const Project = mongoose.model('Project');
    const Task = mongoose.model('Task');

    // 1. Update project status
    const project = await Project.findByIdAndUpdate(
      projectId,
      {
        statut: newStatus,
        updatedBy: userId
      },
      { session, new: true }
    );

    if (!project) {
      throw new Error('Project not found');
    }

    // 2. If project is terminated, mark all non-completed tasks as archived
    if (newStatus === 'termine') {
      await Task.updateMany(
        {
          projet: projectId,
          statut: { $ne: 'terminee' }
        },
        {
          $set: {
            archived: true,
            updatedBy: userId
          }
        },
        { session }
      );
    }

    return project;
  });
}
