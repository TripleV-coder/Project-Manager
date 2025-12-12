import Notification from '@/models/Notification';
import Role from '@/models/Role';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

/**
 * Notify admins about suspicious activities
 * @param {object} auditLog - The audit log that triggered the alert
 * @param {string} reason - Reason for the alert
 */
export async function notifyAdminsAboutSuspiciousActivity(auditLog, reason) {
  try {
    // Find all admin/super admin users
    const adminRole = await Role.findOne({ nom: 'Super Admin' });
    
    if (!adminRole) return;

    const adminUsers = await User.find({
      role_id: adminRole._id,
      status: 'Actif'
    });

    if (adminUsers.length === 0) return;

    // Create notification for each admin
    const notifications = adminUsers.map(admin => ({
      type: 'security_alert',
      titre: 'Suspicious Activity Detected',
      message: `${auditLog.utilisateur_nom} performed ${auditLog.action} on ${auditLog.entity_type}. Reason: ${reason}`,
      entité_type: 'security',
      entité_id: auditLog._id,
      destinataire: admin._id,
      priority: 'critical',
      lu: false,
      metadata: {
        userId: auditLog.utilisateur,
        auditLogId: auditLog._id,
        suspiciousReason: reason,
        ipAddress: auditLog.ip_address
      },
      date_création: new Date()
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

/**
 * Notify admin about multiple failed login attempts
 * @param {string} userId - User ID
 * @param {number} attemptCount - Number of failed attempts
 * @param {string} ipAddress - IP address of attempts
 */
export async function notifyAboutFailedLogins(userId, attemptCount, ipAddress) {
  try {
    const user = await User.findById(userId).select('nom_complet email');
    if (!user) return;

    const adminRole = await Role.findOne({ nom: 'Super Admin' });
    const adminUsers = await User.find({
      role_id: adminRole._id,
      status: 'Actif'
    });

    const notifications = adminUsers.map(admin => ({
      type: 'security_alert',
      titre: 'Multiple Failed Login Attempts',
      message: `${attemptCount} failed login attempts for ${user.nom_complet} (${user.email}) from IP ${ipAddress}`,
      entité_type: 'security',
      entité_id: userId,
      destinataire: admin._id,
      priority: attemptCount > 10 ? 'critical' : 'warning',
      lu: false,
      metadata: {
        targetUserId: userId,
        attemptCount,
        ipAddress
      },
      date_création: new Date()
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying about failed logins:', error);
  }
}

/**
 * Notify admin about bulk deletions
 * @param {string} userId - User ID who performed deletions
 * @param {number} deleteCount - Number of items deleted
 * @param {string} entityType - Type of entities deleted
 */
export async function notifyAboutBulkDeletion(userId, deleteCount, entityType) {
  try {
    const user = await User.findById(userId).select('nom_complet email');
    if (!user) return;

    const adminRole = await Role.findOne({ nom: 'Super Admin' });
    const adminUsers = await User.find({
      role_id: adminRole._id,
      status: 'Actif'
    });

    const notifications = adminUsers.map(admin => ({
      type: 'security_alert',
      titre: 'Bulk Deletion Detected',
      message: `${user.nom_complet} deleted ${deleteCount} ${entityType}(s)`,
      entité_type: 'security',
      entité_id: userId,
      destinataire: admin._id,
      priority: 'critical',
      lu: false,
      metadata: {
        performedBy: userId,
        deleteCount,
        entityType
      },
      date_création: new Date()
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying about bulk deletion:', error);
  }
}

/**
 * Notify admin about permission/role changes
 * @param {string} performedBy - User ID who made the change
 * @param {string} targetUser - User ID whose permissions changed
 * @param {object} changes - Details of what changed
 */
export async function notifyAboutPermissionChange(performedBy, targetUser, changes) {
  try {
    const performer = await User.findById(performedBy).select('nom_complet email');
    const target = await User.findById(targetUser).select('nom_complet email');

    if (!performer || !target) return;

    const adminRole = await Role.findOne({ nom: 'Super Admin' });
    const adminUsers = await User.find({
      role_id: adminRole._id,
      status: 'Actif'
    });

    const changedItems = Object.entries(changes)
      .map(([key, value]) => `${key}: ${value.from} → ${value.to}`)
      .join(', ');

    const notifications = adminUsers.map(admin => ({
      type: 'admin_alert',
      titre: 'Permission/Role Change',
      message: `${performer.nom_complet} changed permissions for ${target.nom_complet}: ${changedItems}`,
      entité_type: 'security',
      entité_id: targetUser,
      destinataire: admin._id,
      priority: 'warning',
      lu: false,
      metadata: {
        performedBy,
        targetUser,
        changes
      },
      date_création: new Date()
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying about permission change:', error);
  }
}

/**
 * Notify user about suspicious login
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address
 * @param {string} device - Device information
 */
export async function notifyUserAboutSuspiciousLogin(userId, ipAddress, device) {
  try {
    await Notification.create({
      type: 'security_alert',
      titre: 'Suspicious Login Detected',
      message: `Your account was accessed from ${device} (${ipAddress}). If this wasn't you, please change your password immediately.`,
      entité_type: 'security',
      entité_id: userId,
      destinataire: userId,
      priority: 'critical',
      lu: false,
      metadata: {
        ipAddress,
        device
      },
      date_création: new Date()
    });
  } catch (error) {
    console.error('Error notifying user about suspicious login:', error);
  }
}

/**
 * Notify about unusual access patterns
 * @param {string} userId - User ID
 * @param {array} unusualPatterns - Array of pattern descriptions
 */
export async function notifyAboutUnusualAccessPatterns(userId, unusualPatterns) {
  try {
    const user = await User.findById(userId).select('nom_complet email');
    if (!user) return;

    const adminRole = await Role.findOne({ nom: 'Super Admin' });
    const adminUsers = await User.find({
      role_id: adminRole._id,
      status: 'Actif'
    });

    const patterns = unusualPatterns.join(', ');

    const notifications = adminUsers.map(admin => ({
      type: 'security_alert',
      titre: 'Unusual Access Patterns',
      message: `${user.nom_complet} shows unusual access patterns: ${patterns}`,
      entité_type: 'security',
      entité_id: userId,
      destinataire: admin._id,
      priority: 'warning',
      lu: false,
      metadata: {
        userId,
        patterns: unusualPatterns
      },
      date_création: new Date()
    }));

    await Notification.insertMany(notifications);
  } catch (error) {
    console.error('Error notifying about unusual patterns:', error);
  }
}

/**
 * Check audit logs and trigger appropriate notifications
 * Used as a scheduled job
 */
export async function processAuditAlertsJob() {
  try {
    // Check last 24 hours
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - 24);

    // Check for multiple failed logins per user
    const failedLoginsByUser = await AuditLog.aggregate([
      {
        $match: {
          action: 'login_failed',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$utilisateur',
          count: { $sum: 1 },
          ipAddresses: { $push: '$ip_address' },
          lastAttempt: { $max: '$timestamp' }
        }
      },
      {
        $match: { count: { $gte: 5 } }
      }
    ]);

    for (const record of failedLoginsByUser) {
      const ipAddress = record.ipAddresses[0] || 'unknown';
      await notifyAboutFailedLogins(record._id, record.count, ipAddress);
    }

    // Check for bulk deletions per user
    const bulkDeletions = await AuditLog.aggregate([
      {
        $match: {
          action: 'suppression',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { user: '$utilisateur', entityType: '$entity_type' },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gte: 10 } }
      }
    ]);

    for (const record of bulkDeletions) {
      await notifyAboutBulkDeletion(record._id.user, record.count, record._id.entityType);
    }

    // Check for unusual access from multiple IPs
    const multipleIPs = await AuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$utilisateur',
          ipAddresses: { $addToSet: '$ip_address' }
        }
      },
      {
        $match: {
          'ipAddresses.5': { $exists: true } // More than 5 unique IPs
        }
      }
    ]);

    for (const record of multipleIPs) {
      const patterns = [
        `Accessed from ${record.ipAddresses.length} different IP addresses`,
        'Potential account compromise or credential sharing'
      ];
      await notifyAboutUnusualAccessPatterns(record._id, patterns);
    }

    console.log('Audit alerts job completed');
  } catch (error) {
    console.error('Error processing audit alerts:', error);
  }
}

export default {
  notifyAdminsAboutSuspiciousActivity,
  notifyAboutFailedLogins,
  notifyAboutBulkDeletion,
  notifyAboutPermissionChange,
  notifyUserAboutSuspiciousLogin,
  notifyAboutUnusualAccessPatterns,
  processAuditAlertsJob
};
