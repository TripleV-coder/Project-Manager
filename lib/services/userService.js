import User from '@/models/User';
import Role from '@/models/Role';
import connectDB from '@/lib/mongodb';
import { PROJECTIONS } from '@/lib/mongoOptimize';
import { hashPassword, verifyPassword } from '@/lib/auth';

// Cache simple pour les utilisateurs fréquemment accédés
const userCache = new Map();
const USER_CACHE_TTL = 60000; // 1 minute

const getCachedUser = (key) => {
  const cached = userCache.get(key);
  if (cached && Date.now() - cached.timestamp < USER_CACHE_TTL) {
    return cached.data;
  }
  userCache.delete(key);
  return null;
};

const setCachedUser = (key, data) => {
  // Limiter la taille du cache
  if (userCache.size > 100) {
    const firstKey = userCache.keys().next().value;
    userCache.delete(firstKey);
  }
  userCache.set(key, { data, timestamp: Date.now() });
};

const invalidateUserCache = (userId) => {
  userCache.delete(`user_${userId}`);
};

class UserService {
  /**
   * Récupérer un utilisateur par ID avec son rôle (avec cache)
   */
  async getUserById(userId, useCache = true) {
    // Vérifier le cache d'abord
    if (useCache) {
      const cached = getCachedUser(`user_${userId}`);
      if (cached) return cached;
    }

    await connectDB();

    const user = await User.findById(userId)
      .select(PROJECTIONS.user.normal)
      .populate('role_id')
      .lean();

    if (user && useCache) {
      setCachedUser(`user_${userId}`, user);
    }

    return user;
  }

  /**
   * Récupérer un utilisateur par email
   */
  async getUserByEmail(email) {
    await connectDB();

    return User.findOne({ email })
      .populate('role_id')
      .lean();
  }

  /**
   * Récupérer tous les utilisateurs (paginé)
   */
  async getUsers(limit = 50, skip = 0, filter = {}) {
    await connectDB();

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(PROJECTIONS.user.normal)
        .populate('role_id')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    return { users, total };
  }

  /**
   * Créer un nouvel utilisateur
   */
  async createUser(data) {
    await connectDB();

    const existingUser = await User.findOne({ email: data.email }).lean();
    if (existingUser) {
      throw new Error('Email déjà utilisé');
    }

    const hashedPassword = await hashPassword(data.password);

    const user = new User({
      nom_complet: data.nom_complet,
      email: data.email,
      password: hashedPassword,
      poste_titre: data.poste_titre,
      département_équipe: data.département_équipe,
      role_id: data.role_id,
      status: data.status || 'Actif',
      first_login: data.first_login !== false,
      must_change_password: data.must_change_password !== false
    });

    await user.save();
    await user.populate('role_id');

    return user.toObject();
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(userId, data) {
    await connectDB();

    const updateData = { ...data };

    // Ne pas permettre la mise à jour du mot de passe via cette méthode
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .select(PROJECTIONS.user.normal)
      .populate('role_id')
      .lean();

    // Invalider le cache après mise à jour
    invalidateUserCache(userId);

    return user;
  }

  /**
   * Mettre à jour le mot de passe
   */
  async updatePassword(userId, oldPassword, newPassword) {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    const isValidPassword = await verifyPassword(oldPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Mot de passe ancien incorrect');
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    return true;
  }

  /**
   * Changer le mot de passe (admin force change)
   */
  async forceChangePassword(userId, newPassword) {
    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    user.password = await hashPassword(newPassword);
    user.first_login = false;
    await user.save();

    return true;
  }

  /**
   * Vérifier les credentials
   */
  async verifyCredentials(email, password) {
    await connectDB();

    const user = await User.findOne({ email }).select('+password').populate('role_id');
    if (!user) {
      return null;
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return null;
    }

    return user.toObject();
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(userId) {
    await connectDB();

    // Invalider le cache
    invalidateUserCache(userId);

    return User.findByIdAndDelete(userId);
  }

  /**
   * Mettre à jour le dernier login
   */
  async updateLastLogin(userId) {
    await connectDB();

    return User.findByIdAndUpdate(
      userId,
      { dernière_connexion: new Date() },
      { new: true }
    ).lean();
  }

  /**
   * Changer le rôle d'un utilisateur
   */
  async updateUserRole(userId, roleId) {
    await connectDB();

    const role = await Role.findById(roleId).lean();
    if (!role) {
      throw new Error('Rôle non trouvé');
    }

    return User.findByIdAndUpdate(
      userId,
      { role_id: roleId },
      { new: true }
    )
      .populate('role_id')
      .lean();
  }

  /**
   * Récupérer les statistiques d'un utilisateur
   */
  async getUserStats(userId) {
    await connectDB();

    const Task = require('@/models/Task').default;
    const Project = require('@/models/Project').default;

    const [taskCount, completedTaskCount, projectCount] = await Promise.all([
      Task.countDocuments({ assigné_à: userId }),
      Task.countDocuments({ assigné_à: userId, statut: 'Terminée' }),
      Project.countDocuments({
        $or: [
          { chef_projet: userId },
          { product_owner: userId },
          { 'membres.user_id': userId }
        ]
      })
    ]);

    return {
      taskCount,
      completedTaskCount,
      projectCount,
      completionRate: taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0
    };
  }
}

export default new UserService();
