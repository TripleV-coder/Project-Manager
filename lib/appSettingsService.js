import AppSettings from '@/models/AppSettings';
import connectDB from '@/lib/mongodb';

// Cache en mémoire avec expiration (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;
const settingsCache = new Map();

class AppSettingsService {
  async getSetting(key, defaultValue = null) {
    try {
      await connectDB();

      // Vérifier le cache
      const cached = settingsCache.get(key);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.value;
      }

      // Récupérer de la BD
      const setting = await AppSettings.findOne({ key }).lean();
      const value = setting ? setting.value : defaultValue;

      // Mettre en cache
      settingsCache.set(key, {
        value,
        timestamp: Date.now()
      });

      return value;
    } catch (error) {
      console.error(`Erreur lecture setting ${key}:`, error);
      return defaultValue;
    }
  }

  async setSetting(key, value, updatedBy = null) {
    try {
      await connectDB();

      const updated = await AppSettings.findOneAndUpdate(
        { key },
        {
          key,
          value,
          updated_by: updatedBy,
          updated_at: new Date()
        },
        { upsert: true, new: true }
      );

      // Invalider le cache
      settingsCache.delete(key);

      return updated;
    } catch (error) {
      console.error(`Erreur écriture setting ${key}:`, error);
      throw error;
    }
  }

  async getAllSettings() {
    try {
      await connectDB();
      const settings = await AppSettings.find({}).lean();
      return Object.fromEntries(settings.map(s => [s.key, s.value]));
    } catch (error) {
      console.error('Erreur lecture settings:', error);
      return {};
    }
  }

  async getMaintenanceMode() {
    return this.getSetting('maintenance_mode', false);
  }

  async setMaintenanceMode(enabled, updatedBy = null) {
    return this.setSetting('maintenance_mode', enabled, updatedBy);
  }

  async getAppSettings() {
    return this.getSetting('app_settings', {});
  }

  async setAppSettings(settings, updatedBy = null) {
    return this.setSetting('app_settings', settings, updatedBy);
  }

  // Récupérer les paramètres de sécurité avec valeurs par défaut
  async getSecuritySettings() {
    const settings = await this.getAppSettings();
    return {
      sessionTimeout: settings.sessionTimeout || 30, // minutes
      passwordMinLength: settings.passwordMinLength || 8,
      passwordRequireNumbers: settings.passwordRequireNumbers !== false,
      passwordRequireSymbols: settings.passwordRequireSymbols !== false,
      maxLoginAttempts: settings.maxLoginAttempts || 5,
      lockoutDuration: settings.lockoutDuration || 15, // minutes
      twoFactorEnabled: settings.twoFactorEnabled || false
    };
  }

  // Récupérer les paramètres de notification avec valeurs par défaut
  async getNotificationSettings() {
    const settings = await this.getAppSettings();
    return {
      emailNotifications: settings.emailNotifications !== false,
      pushNotifications: settings.pushNotifications !== false,
      notifyTaskAssigned: settings.notifyTaskAssigned !== false,
      notifyTaskCompleted: settings.notifyTaskCompleted !== false,
      notifyCommentMention: settings.notifyCommentMention !== false,
      notifySprintStart: settings.notifySprintStart !== false,
      notifyBudgetAlert: settings.notifyBudgetAlert !== false
    };
  }

  // Invalider tout le cache (à appeler après mise à jour en masse)
  clearCache() {
    settingsCache.clear();
  }
}

export default new AppSettingsService();
