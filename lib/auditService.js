import AuditLog from '@/models/AuditLog';
import UserSession from '@/models/UserSession';
import { UAParser } from 'ua-parser-js';

/**
 * Extract device and browser information from User-Agent
 */
function parseUserAgent(userAgent) {
  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();
    
    return {
      navigateur: result.browser.name || 'Unknown',
      navigateur_version: result.browser.version || 'Unknown',
      os: result.os.name || 'Unknown',
      os_version: result.os.version || 'Unknown',
      device_type: result.device.type || 'desktop'
    };
  } catch (error) {
    console.error('Error parsing user agent:', error);
    return {
      navigateur: 'Unknown',
      navigateur_version: 'Unknown',
      os: 'Unknown',
      os_version: 'Unknown',
      device_type: 'unknown'
    };
  }
}

/**
 * Get geolocation from IP address (using a free service or local DB)
 * For production, use MaxMind GeoIP2 or similar service
 */
async function getGeoLocation(ipAddress) {
  try {
    // Skip local IPs
    if (ipAddress.startsWith('127.') || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return { country: 'Local', city: 'Local' };
    }

    // Optional: Integrate with IP geolocation service
    // For now, return minimal data
    return { country: null, city: null };
  } catch (error) {
    console.error('Error getting geolocation:', error);
    return { country: null, city: null };
  }
}

/**
 * Extract IP address from request headers
 */
function getClientIP(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  return request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') ||
         'unknown';
}

/**
 * Log user activity with comprehensive tracking
 * @param {object} user - User object performing the action
 * @param {string} action - Action type
 * @param {string} entityType - Type of entity being acted upon
 * @param {string} entityId - ID of the entity
 * @param {string} description - Description of the action
 * @param {object} options - Additional options
 * @returns {Promise<object>} Created audit log document
 */
export async function logActivity(user, action, entityType, entityId, description, options = {}) {
  try {
    const {
      request = null,
      oldValue = null,
      newValue = null,
      changedFields = [],
      severity = 'info',
      isSensitive = false,
      isSuspicious = false,
      httpMethod = 'POST',
      endpoint = null,
      httpStatus = 200,
      relatedProjectId = null,
      relatedUserIds = [],
      metadata = null,
      durationMs = null,
      responseSize = null
    } = options;

    // Extract technical context from request
    let ipAddress = 'unknown';
    let userAgent = 'unknown';
    let sessionId = null;
    let geoLocation = { country: null, city: null };
    let uaData = {};

    if (request) {
      ipAddress = getClientIP(request);
      userAgent = request.headers.get('user-agent') || 'unknown';
      sessionId = request.headers.get('x-session-id');
      geoLocation = await getGeoLocation(ipAddress);
      uaData = parseUserAgent(userAgent);
    }

    // Determine severity based on action and result
    let computedSeverity = severity;
    if (['suppression', 'permission_change', 'role_change', 'password_reset'].includes(action)) {
      computedSeverity = 'warning';
    }
    if (action === 'access_denied' || action === 'login_failed') {
      computedSeverity = isSuspicious ? 'critical' : 'warning';
    }

    // Create audit log
    const auditLog = await AuditLog.create({
      utilisateur: user._id,
      utilisateur_email: user.email,
      utilisateur_nom: user.nom_complet,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_nom: options.entityName || null,
      entity_properties: options.entityProperties || [],
      description,
      old_value: oldValue,
      new_value: newValue,
      changed_fields: changedFields,
      ip_address: ipAddress,
      ip_country: geoLocation.country,
      ip_city: geoLocation.city,
      user_agent: userAgent,
      navigateur: uaData.navigateur,
      navigateur_version: uaData.navigateur_version,
      os: uaData.os,
      os_version: uaData.os_version,
      device_type: uaData.device_type,
      session_id: sessionId,
      http_method: httpMethod,
      endpoint,
      http_status: httpStatus,
      result: httpStatus >= 200 && httpStatus < 300 ? 'success' : (httpStatus === 400 ? 'failure' : 'partial'),
      severity: computedSeverity,
      is_sensitive: isSensitive,
      is_suspicious: isSuspicious,
      metadata,
      duration_ms: durationMs,
      response_size_bytes: responseSize,
      related_user_ids: relatedUserIds,
      related_project_id: relatedProjectId,
      timestamp: new Date()
    });

    // Update session activity count if sessionId exists
    if (sessionId) {
      await UserSession.findOneAndUpdate(
        { session_token: sessionId },
        {
          $inc: { actions_count: 1 },
          last_activity: new Date()
        }
      );
    }

    return auditLog;
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw, just log the error
    return null;
  }
}

/**
 * Create or update user session
 * @param {object} user - User object
 * @param {string} sessionToken - Session token/JWT
 * @param {object} request - Request object
 * @returns {Promise<object>} User session document
 */
export async function createUserSession(user, sessionToken, request) {
  try {
    const ipAddress = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const uaData = parseUserAgent(userAgent);
    const geoLocation = await getGeoLocation(ipAddress);

    const session = await UserSession.create({
      utilisateur: user._id,
      utilisateur_email: user.email,
      utilisateur_nom: user.nom_complet,
      session_token: sessionToken,
      login_time: new Date(),
      ip_address: ipAddress,
      ip_country: geoLocation.country,
      ip_city: geoLocation.city,
      user_agent: userAgent,
      navigateur: uaData.navigateur,
      navigateur_version: uaData.navigateur_version,
      os: uaData.os,
      os_version: uaData.os_version,
      device_type: uaData.device_type,
      type_connexion: 'local',
      statut: 'actif',
      is_secure: request.url.startsWith('https')
    });

    // Log login activity
    await logActivity(user, 'connexion', 'utilisateur', user._id, 'Connexion réussie', {
      request,
      severity: 'info'
    });

    return session;
  } catch (error) {
    console.error('Error creating user session:', error);
    return null;
  }
}

/**
 * End user session
 * @param {string} sessionToken - Session token
 * @returns {Promise<void>}
 */
export async function endUserSession(sessionToken) {
  try {
    const session = await UserSession.findOneAndUpdate(
      { session_token: sessionToken },
      {
        logout_time: new Date(),
        statut: 'inactif',
        duration_minutes: null
      }
    );

    if (session) {
      // Calculate duration
      const durationMs = new Date() - new Date(session.login_time);
      const durationMinutes = Math.floor(durationMs / 60000);
      
      await UserSession.findByIdAndUpdate(session._id, {
        duration_minutes: durationMinutes
      });
    }
  } catch (error) {
    console.error('Error ending user session:', error);
  }
}

/**
 * Get user activity history
 * @param {string} userId - User ID to get history for
 * @param {object} filters - Filter options
 * @returns {Promise<array>} Array of audit logs
 */
export async function getUserActivityHistory(userId, filters = {}) {
  try {
    const {
      limit = 100,
      skip = 0,
      action = null,
      entityType = null,
      startDate = null,
      endDate = null,
      severity = null
    } = filters;

    const query = { utilisateur: userId };

    if (action) query.action = action;
    if (entityType) query.entity_type = entityType;
    if (severity) query.severity = severity;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .populate('utilisateur', 'nom_complet email')
      .lean();

    const total = await AuditLog.countDocuments(query);

    return { logs, total, page: Math.floor(skip / limit) + 1 };
  } catch (error) {
    console.error('Error getting user activity history:', error);
    throw error;
  }
}

/**
 * Get all audit logs with advanced filtering
 * @param {object} filters - Filter options
 * @returns {Promise<object>} Audit logs and metadata
 */
export async function getAuditLogs(filters = {}) {
  try {
    const {
      userId = null,
      action = null,
      entityType = null,
      severity = null,
      startDate = null,
      endDate = null,
      ipAddress = null,
      sessionId = null,
      result = null,
      limit = 50,
      skip = 0,
      sort = { timestamp: -1 }
    } = filters;

    const query = {};

    if (userId) query.utilisateur = userId;
    if (action) query.action = action;
    if (entityType) query.entity_type = entityType;
    if (severity) query.severity = severity;
    if (ipAddress) query.ip_address = ipAddress;
    if (sessionId) query.session_id = sessionId;
    if (result) query.result = result;

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .populate('utilisateur', 'nom_complet email avatar')
      .lean();

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
}

/**
 * Get audit statistics
 * @param {object} options - Statistics options
 * @returns {Promise<object>} Statistics data
 */
export async function getAuditStatistics(options = {}) {
  try {
    const { startDate = null, endDate = null } = options;

    const query = {};
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Total activities
    const totalActivities = await AuditLog.countDocuments(query);

    // By action
    const byAction = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // By entity type
    const byEntityType = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: '$entity_type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // By severity
    const bySeverity = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    // By user
    const byUser = await AuditLog.aggregate([
      { $match: query },
      { $group: { _id: '$utilisateur', count: { $sum: 1 }, email: { $first: '$utilisateur_email' } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Failed login attempts
    const failedLogins = await AuditLog.countDocuments({
      ...query,
      action: 'login_failed'
    });

    // Suspicious activities
    const suspiciousActivities = await AuditLog.countDocuments({
      ...query,
      is_suspicious: true
    });

    return {
      totalActivities,
      byAction: Object.fromEntries(byAction.map(x => [x._id, x.count])),
      byEntityType: Object.fromEntries(byEntityType.map(x => [x._id, x.count])),
      bySeverity: Object.fromEntries(bySeverity.map(x => [x._id, x.count])),
      topUsers: byUser,
      failedLogins,
      suspiciousActivities
    };
  } catch (error) {
    console.error('Error getting audit statistics:', error);
    throw error;
  }
}

/**
 * Export audit logs to CSV
 * @param {object} filters - Filter options
 * @returns {Promise<string>} CSV content
 */
export async function exportAuditLogsToCsv(filters = {}) {
  try {
    const { logs } = await getAuditLogs({ ...filters, limit: 10000 });

    if (!logs || logs.length === 0) {
      return 'No data to export';
    }

    // CSV headers
    const headers = [
      'Timestamp',
      'User Email',
      'User Name',
      'Action',
      'Entity Type',
      'Description',
      'IP Address',
      'Device',
      'Severity',
      'Result',
      'Status Code'
    ];

    // CSV rows
    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.utilisateur_email,
      log.utilisateur_nom,
      log.action,
      log.entity_type,
      log.description ? log.description.replace(/"/g, '""') : '',
      log.ip_address,
      `${log.navigateur} / ${log.os}`,
      log.severity,
      log.result,
      log.http_status
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    return csvContent;
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
}

/**
 * Detect suspicious activities
 * @param {string} userId - User ID
 * @param {number} hoursWindow - Time window in hours
 * @returns {Promise<array>} Array of suspicious indicators
 */
export async function detectSuspiciousActivity(userId, hoursWindow = 24) {
  try {
    const startDate = new Date(Date.now() - hoursWindow * 60 * 60 * 1000);

    const anomalies = [];

    // Multiple login failures
    const failedLogins = await AuditLog.countDocuments({
      utilisateur: userId,
      action: 'login_failed',
      timestamp: { $gte: startDate }
    });

    if (failedLogins > 5) {
      anomalies.push({
        type: 'multiple_failed_logins',
        severity: 'warning',
        message: `${failedLogins} failed login attempts in the last ${hoursWindow} hours`,
        count: failedLogins
      });
    }

    // Bulk deletions
    const deletions = await AuditLog.countDocuments({
      utilisateur: userId,
      action: 'suppression',
      timestamp: { $gte: startDate }
    });

    if (deletions > 10) {
      anomalies.push({
        type: 'bulk_deletion',
        severity: 'critical',
        message: `${deletions} deletions in the last ${hoursWindow} hours`,
        count: deletions
      });
    }

    // Permission changes
    const permChanges = await AuditLog.countDocuments({
      utilisateur: userId,
      action: 'permission_change',
      timestamp: { $gte: startDate }
    });

    if (permChanges > 3) {
      anomalies.push({
        type: 'permission_changes',
        severity: 'warning',
        message: `${permChanges} permission changes in the last ${hoursWindow} hours`,
        count: permChanges
      });
    }

    // Unusual location access (if enabled)
    const ips = await AuditLog.distinct('ip_address', {
      utilisateur: userId,
      timestamp: { $gte: startDate }
    });

    if (ips.length > 5) {
      anomalies.push({
        type: 'multiple_locations',
        severity: 'info',
        message: `Access from ${ips.length} different IP addresses`,
        count: ips.length
      });
    }

    return anomalies;
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    throw error;
  }
}

export default {
  logActivity,
  createUserSession,
  endUserSession,
  getUserActivityHistory,
  getAuditLogs,
  getAuditStatistics,
  exportAuditLogsToCsv,
  detectSuspiciousActivity
};
