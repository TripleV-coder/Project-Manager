import { NextResponse } from 'next/server';
import {
  getAuditLogs,
  getUserActivityHistory,
  getAuditStatistics,
  exportAuditLogsToCsv,
  detectSuspiciousActivity
} from './auditService';
import AuditLog from '@/models/AuditLog';
import UserSession from '@/models/UserSession';

/**
 * Handle GET /api/audit - Get audit logs with filtering
 */
export async function handleGetAuditLogs(url, user) {
  try {
    // Check permission
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = new URL(url).searchParams;
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const severity = searchParams.get('severity');
    const projectId = searchParams.get('projectId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const ipAddress = searchParams.get('ipAddress');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = parseInt(searchParams.get('skip')) || 0;

    // Get audit logs
    const result = await getAuditLogs({
      userId,
      action,
      entityType,
      severity,
      projectId,
      startDate,
      endDate,
      ipAddress,
      limit,
      skip
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to get audit logs', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/audit/user/:userId - Get user activity history
 */
export async function handleGetUserActivity(userId, url, user) {
  try {
    // Check permission
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = new URL(url).searchParams;
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit')) || 100;
    const skip = parseInt(searchParams.get('skip')) || 0;

    const result = await getUserActivityHistory(userId, {
      action,
      entityType,
      severity,
      startDate,
      endDate,
      limit,
      skip
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting user activity:', error);
    return NextResponse.json(
      { error: 'Failed to get user activity', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/audit/statistics - Get audit statistics
 */
export async function handleGetAuditStatistics(url, user) {
  try {
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = new URL(url).searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const stats = await getAuditStatistics({
      startDate,
      endDate
    });

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting audit statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get statistics', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/audit/export - Export audit logs
 */
export async function handleExportAuditLogs(url, user) {
  try {
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = new URL(url).searchParams;
    const format = searchParams.get('format') || 'csv';
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (format === 'csv') {
      const csv = await exportAuditLogsToCsv({
        userId,
        action,
        entityType,
        severity,
        startDate,
        endDate
      });

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="audit-logs.csv"'
        }
      });
    } else if (format === 'json') {
      const { logs } = await getAuditLogs({
        userId,
        action,
        entityType,
        severity,
        startDate,
        endDate,
        limit: 10000
      });

      return NextResponse.json(logs);
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/audit/suspicious - Detect suspicious activities
 */
export async function handleDetectSuspiciousActivities(url, user) {
  try {
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = new URL(url).searchParams;
    const userId = searchParams.get('userId');
    const hoursWindow = parseInt(searchParams.get('hoursWindow')) || 24;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const anomalies = await detectSuspiciousActivity(userId, hoursWindow);

    return NextResponse.json({
      userId,
      hoursWindow,
      anomalies,
      hasSuspiciousActivity: anomalies.length > 0
    });
  } catch (error) {
    console.error('Error detecting suspicious activity:', error);
    return NextResponse.json(
      { error: 'Failed to detect suspicious activity', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/audit/sessions - Get user sessions
 */
export async function handleGetUserSessions(url, user) {
  try {
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = new URL(url).searchParams;
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = parseInt(searchParams.get('skip')) || 0;

    const query = userId ? { utilisateur: userId } : {};

    const sessions = await UserSession.find(query)
      .sort({ login_time: -1 })
      .limit(limit)
      .skip(skip)
      .populate('utilisateur', 'nom_complet email')
      .lean();

    const total = await UserSession.countDocuments(query);

    return NextResponse.json({
      sessions,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return NextResponse.json(
      { error: 'Failed to get user sessions', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/audit/summary - Get audit summary for dashboard
 */
export async function handleGetAuditSummary(url, user) {
  try {
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const searchParams = new URL(url).searchParams;
    const days = parseInt(searchParams.get('days')) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total activities last N days
    const totalActivities = await AuditLog.countDocuments({
      timestamp: { $gte: startDate }
    });

    // Activities by action (last N days)
    const activitiesByAction = await AuditLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Critical events
    const criticalEvents = await AuditLog.countDocuments({
      timestamp: { $gte: startDate },
      severity: 'critical'
    });

    // Failed logins
    const failedLogins = await AuditLog.countDocuments({
      timestamp: { $gte: startDate },
      action: 'login_failed'
    });

    // Active users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeUsersToday = await AuditLog.distinct('utilisateur', {
      timestamp: { $gte: today }
    });

    // Recent critical activities
    const recentCriticalActivities = await AuditLog.find({
      timestamp: { $gte: startDate },
      severity: 'critical'
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('utilisateur', 'nom_complet email')
      .lean();

    return NextResponse.json({
      period: { days, startDate, endDate: new Date() },
      summary: {
        totalActivities,
        criticalEvents,
        failedLogins,
        activeUsersCount: activeUsersToday.length
      },
      activitiesByAction: Object.fromEntries(
        activitiesByAction.map(a => [a._id, a.count])
      ),
      recentCriticalActivities
    });
  } catch (error) {
    console.error('Error getting audit summary:', error);
    return NextResponse.json(
      { error: 'Failed to get audit summary', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle GET /api/audit/actions - Get available audit actions
 */
export function handleGetAvailableActions(user) {
  try {
    if (!user.role_id?.permissions?.voirAudit) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const actions = [
      'connexion',
      'déconnexion',
      'création',
      'modification',
      'suppression',
      'consultation',
      'validation',
      'refus',
      'assignation',
      'changement_statut',
      'upload_fichier',
      'download_fichier',
      'export',
      'import',
      'permission_change',
      'role_change',
      'password_reset',
      'password_change',
      'email_change',
      'login_failed',
      'access_denied',
      'bulk_action',
      'api_call'
    ];

    const severities = ['info', 'warning', 'error', 'critical'];
    const entityTypes = [
      'utilisateur',
      'tâche',
      'projet',
      'sprint',
      'comment',
      'timesheet',
      'dépense',
      'deliverable',
      'role',
      'permission',
      'file',
      'système'
    ];

    return NextResponse.json({
      actions,
      severities,
      entityTypes
    });
  } catch (error) {
    console.error('Error getting available actions:', error);
    return NextResponse.json(
      { error: 'Failed to get available actions' },
      { status: 500 }
    );
  }
}

export default {
  handleGetAuditLogs,
  handleGetUserActivity,
  handleGetAuditStatistics,
  handleExportAuditLogs,
  handleDetectSuspiciousActivities,
  handleGetUserSessions,
  handleGetAuditSummary,
  handleGetAvailableActions
};
