# Audit System - Quick Start

## Installation Checklist

- [ ] **Install dependency**: `npm install ua-parser-js`
- [ ] **Models created**: UserSession.js, AuditLog.js (updated)
- [ ] **Services created**: auditService.js, auditApiHandler.js, auditNotificationService.js
- [ ] **Pages created**: `/dashboard/admin/audit`, `/dashboard/admin/audit/user/[userId]`
- [ ] **API routes added** to `app/api/[[...path]]/route.js`
- [ ] **Scheduled job** configured for alerts
- [ ] **Permissions** updated in roles

## 5-Minute Setup

### 1. Add to Main API Route

```javascript
// app/api/[[...path]]/route.js
import { handleGetAuditLogs, handleGetAuditStatistics } from '@/lib/auditApiHandler';
import { logActivity } from '@/lib/auditService';

// Add these routes at the end before the 404:
if (path === '/audit' || path === '/audit/') {
  return handleGetAuditLogs(request.url, user);
}

if (path === '/audit/statistics' || path === '/audit/statistics/') {
  return handleGetAuditStatistics(request.url, user);
}

// Log login activity
if (path === '/auth/login' || path === '/auth/login/') {
  const user = await authenticate(request); // ... existing logic
  if (user) {
    await logActivity(user, 'connexion', 'utilisateur', user._id, 'Login successful', { request });
  }
}
```

### 2. Track Modifications

For any update endpoint, add:

```javascript
// Capture before values
const oldValues = { titre: task.titre, statut: task.statut };

// ... do update ...

// Log after update
await logActivity(
  user,
  'modification',
  'tâche',
  task._id,
  `Updated task: ${task.titre}`,
  {
    request,
    oldValue: oldValues,
    newValue: { titre: task.titre, statut: task.statut },
    changedFields: ['titre', 'statut']
  }
);
```

### 3. Add Audit to Admin Dashboard

Add link in `/dashboard/admin/page.js`:

```javascript
<Link href="/dashboard/admin/audit">
  <Card className="hover:shadow-lg cursor-pointer">
    <CardHeader>
      <Activity className="w-5 h-5 text-blue-600" />
      <CardTitle>Audit Activity</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-600">View user activity and audit logs</p>
    </CardContent>
  </Card>
</Link>
```

### 4. Grant Permissions

Update role permissions to include 'voirAudit':

```javascript
{
  nom: 'Super Admin',
  permissions: {
    voirAudit: true,  // Add this
    // ... other permissions
  }
}
```

### 5. (Optional) Set Up Scheduled Alerts

Create `scripts/auditAlerts.js`:

```javascript
import { processAuditAlertsJob } from '@/lib/auditNotificationService';

async function run() {
  console.log('Running audit alerts...');
  await processAuditAlertsJob();
  console.log('Done');
}

run().catch(console.error);
```

Run with: `node scripts/auditAlerts.js`

Or set up cron: `0 * * * * node scripts/auditAlerts.js`

## What You Get

✅ **Complete Activity Tracking**
- Every user action logged
- Who did what, when, where
- Before/after values for changes
- Device and location information

✅ **Admin Dashboard**
- Real-time activity overview
- Advanced filtering and search
- Export to CSV/JSON
- Suspicious activity alerts

✅ **User Activity Pages**
- Per-user activity history
- Login sessions tracking
- Suspicious pattern detection
- Session analytics

✅ **Security Alerts**
- Multiple failed login attempts
- Bulk deletion warnings
- Unusual access patterns
- Permission change notifications

## File Structure

```
models/
  AuditLog.js          (Enhanced)
  UserSession.js       (New)

lib/
  auditService.js      (Main service, 582 lines)
  auditApiHandler.js   (API handlers, 413 lines)
  auditNotificationService.js (Alerts, 346 lines)

app/dashboard/admin/
  audit/
    page.js            (Main dashboard, 560 lines)
    user/
      [userId]/
        page.js        (User details, 375 lines)

Documentation/
  AUDIT_SYSTEM_GUIDE.md     (Complete guide)
  AUDIT_QUICK_START.md      (This file)
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/audit` | Get audit logs with filters |
| GET | `/api/audit/user/:userId` | Get user activity history |
| GET | `/api/audit/statistics` | Get statistics |
| GET | `/api/audit/export` | Export logs (CSV/JSON) |
| GET | `/api/audit/suspicious` | Detect suspicious activities |
| GET | `/api/audit/sessions` | Get user sessions |
| GET | `/api/audit/summary` | Dashboard summary |
| GET | `/api/audit/actions` | Available actions/filters |

## Key Features

### Activity Tracking
```
Tracks: connexion, déconnexion, création, modification, suppression,
        consultation, validation, refus, assignation, changement_statut,
        upload_fichier, download_fichier, export, import,
        permission_change, role_change, password_reset, etc.
```

### Filters Available
- User
- Action type
- Entity type
- Severity (info, warning, error, critical)
- Date range
- IP address
- Session ID
- Result (success, failure, partial)

### Data Captured
- User ID and email (denormalized)
- IP address and location
- Browser and OS details
- Device type
- HTTP method and endpoint
- Request/response details
- Old and new values
- Session information
- Severity level
- Custom metadata

### Suspicious Activity Detection
- Multiple failed logins (>5 in 24h)
- Bulk deletions (>10 items in 24h)
- Multiple location access (>5 IPs in 24h)
- Permission changes (>3 in 24h)

## Database Indexes

Automatically created by MongoDB:

```javascript
// Standard indexes
{ utilisateur: 1, timestamp: -1 }
{ entity_type: 1, entity_id: 1, timestamp: -1 }
{ action: 1, timestamp: -1 }
{ timestamp: -1 }
{ ip_address: 1, timestamp: -1 }
{ severity: 1, timestamp: -1 }
{ session_id: 1, timestamp: -1 }
```

## Performance Notes

- **Small deployments**: No optimization needed
- **Medium deployments**: Use pagination, index on frequently filtered fields
- **Large deployments**: Archive logs >90 days, implement data retention policy

## Troubleshooting

### Dashboard shows "No data"
1. Ensure `logActivity()` is called in your API routes
2. Check that activities were created after deployment
3. Verify permission 'voirAudit' is granted

### Export not working
1. Check endpoint returns data first
2. Verify CSV formatting is correct
3. Check browser download settings

### Slow performance
1. Add index on frequently queried fields
2. Reduce date range in filters
3. Archive old logs (>1 year)

### No alerts being sent
1. Check notification system is configured
2. Verify admins have active status
3. Review error logs in console

## Example Usage

### Log a task creation:
```javascript
await logActivity(
  user,
  'création',
  'tâche',
  taskId,
  `Created task: ${task.titre}`,
  { request }
);
```

### Log a user permission change:
```javascript
await logActivity(
  admin,
  'permission_change',
  'utilisateur',
  targetUserId,
  `Changed permissions for ${user.nom_complet}`,
  {
    request,
    oldValue: { role: oldRole },
    newValue: { role: newRole },
    severity: 'warning'
  }
);
```

### Query activity history:
```javascript
const { logs, total } = await getUserActivityHistory(userId, {
  action: 'modification',
  limit: 100,
  skip: 0
});
```

### Export logs:
```javascript
const csv = await exportAuditLogsToCsv({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  severity: 'critical'
});
```

## Next Steps

1. ✅ Implement core tracking in API routes
2. ✅ Test audit dashboard access
3. ✅ Configure scheduled alerts
4. ✅ Review and archive old logs regularly
5. ✅ Monitor for false positives in alerts
6. ✅ Document custom audit rules for your team

## Support

Refer to `AUDIT_SYSTEM_GUIDE.md` for:
- Complete architecture overview
- Detailed integration instructions
- Security considerations
- Compliance information
- Advanced features
- Troubleshooting guide

---

**Ready to deploy!** 🚀
