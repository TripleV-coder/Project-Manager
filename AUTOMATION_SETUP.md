# Status Automation Setup Guide

This guide explains how to set up the status automation worker in different deployment environments.

## Quick Start

The status automation worker processes:
- Auto-transitions for tasks, timesheets, expenses, sprints, and projects
- Escalation actions when statuses exceed time thresholds
- Overdue task notifications

## Setup by Environment

### 1. Local Development

Run manually or on a schedule using Node cron:

```javascript
// app/api/cron/status-automation/route.js
import { processAllAutoTransitions, checkOverdueTasks } from '@/lib/statusAutomationWorker';

export async function GET(request) {
  // Verify this is a legitimate cron call
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await processAllAutoTransitions();
    const overdueResults = await checkOverdueTasks();

    return Response.json({
      success: true,
      transitioned: results.totalTransitioned,
      overdue: overdueResults.overdueTasks,
      timestamp: new Date()
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

Run via curl:
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://localhost:3000/api/cron/status-automation
```

### 2. Vercel Deployment

**Option A: Using Vercel Cron Functions (Recommended)**

Create `api/cron/status-automation.js`:

```javascript
// pages/api/cron/status-automation.js
import { processAllAutoTransitions, checkOverdueTasks } from '@/lib/statusAutomationWorker';

export default async function handler(req, res) {
  // Verify this is from Vercel's cron scheduler
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = await processAllAutoTransitions();
    const overdueResults = await checkOverdueTasks();

    res.status(200).json({
      success: true,
      transitioned: results.totalTransitioned,
      overdue: overdueResults.overdueTasks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: {
    // Limit cron to 60s execution
    maxDuration: 60
  }
};
```

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/status-automation",
      "schedule": "0 * * * *"
    }
  ]
}
```

The schedule `"0 * * * *"` means: Run at the top of every hour (UTC).

Common schedules:
- `"0 * * * *"` - Every hour
- `"*/30 * * * *"` - Every 30 minutes
- `"0 0 * * *"` - Daily at midnight
- `"0 */4 * * *"` - Every 4 hours

**Option B: Using Vercel Cron with Package**

Install:
```bash
npm install @vercel/cron
```

Use:
```javascript
import { CronRequest } from '@vercel/cron';

export async function handleCron(req: CronRequest) {
  const results = await processAllAutoTransitions();
  return { processed: results.totalTransitioned };
}

export const config = {
  matcher: '/api/cron/status-automation'
};
```

### 3. GitHub Actions (Free)

Create `.github/workflows/status-automation.yml`:

```yaml
name: Status Automation

on:
  schedule:
    # Run every hour
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  automation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run status automation
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          NODE_ENV: production
        run: node scripts/runStatusAutomation.js
```

### 4. AWS Lambda (Serverless)

Create `lambda/statusAutomation.js`:

```javascript
import { processAllAutoTransitions, checkOverdueTasks } from '../lib/statusAutomationWorker';

export const handler = async (event, context) => {
  try {
    console.log('Starting Lambda execution...');
    
    const results = await processAllAutoTransitions();
    const overdueResults = await checkOverdueTasks();

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        transitioned: results.totalTransitioned,
        overdue: overdueResults.overdueTasks,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

Deploy with SAM:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  StatusAutomationFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: lambda/statusAutomation.handler
      Runtime: nodejs18.x
      Environment:
        Variables:
          MONGODB_URI: !Ref MongoDBUri
      Events:
        ScheduleEvent:
          Type: Schedule
          Properties:
            # Run every hour
            Schedule: 'rate(1 hour)'
```

### 5. Google Cloud Functions

Create `functions/statusAutomation.js`:

```javascript
import { processAllAutoTransitions, checkOverdueTasks } from '../lib/statusAutomationWorker';

export const statusAutomation = async (req, res) => {
  try {
    const results = await processAllAutoTransitions();
    const overdueResults = await checkOverdueTasks();

    res.status(200).json({
      success: true,
      transitioned: results.totalTransitioned,
      overdue: overdueResults.overdueTasks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Function error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

Deploy:

```bash
gcloud functions deploy statusAutomation \
  --runtime nodejs18 \
  --trigger-topic status-automation \
  --entry-point statusAutomation \
  --set-env-vars MONGODB_URI=$MONGODB_URI
```

Set up Cloud Scheduler:

```bash
gcloud scheduler jobs create pubsub status-automation \
  --schedule "0 * * * *" \
  --topic status-automation \
  --message-body '{}'
```

### 6. Self-Hosted Server (Cron)

Add to crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs every hour)
0 * * * * cd /path/to/app && /usr/bin/node scripts/runStatusAutomation.js >> /var/log/status-automation.log 2>&1
```

Or use a Node scheduler package like `node-schedule`:

```javascript
// scripts/scheduler.js
import schedule from 'node-schedule';
import { processAllAutoTransitions } from '../lib/statusAutomationWorker';

// Run every hour
schedule.scheduleJob('0 * * * *', async () => {
  console.log('Running scheduled status automation...');
  await processAllAutoTransitions();
});
```

### 7. Docker Container

Add to Docker startup:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY . .
RUN npm ci --production

# Install crond
RUN apk add --no-cache dcron

# Copy cron job
COPY crontab /etc/crontabs/root

CMD ["crond", "-f", "-d8"]
```

Create `crontab`:

```
# Run automation every hour
0 * * * * cd /app && node scripts/runStatusAutomation.js >> /var/log/automation.log 2>&1
```

## Configuration

Set environment variables for all environments:

```env
# MongoDB connection
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname

# Cron authentication
CRON_SECRET=your-secret-key-here

# Optional: Logging
LOG_LEVEL=info
SEND_NOTIFICATIONS=true
```

## Monitoring

### Check Recent Runs

```javascript
// Add to your admin dashboard
import AuditLog from '@/models/AuditLog';

async function getAutomationHistory() {
  return await AuditLog.find({
    type_entité: { $in: ['task', 'timesheet', 'expense', 'sprint'] },
    description: /Auto-transition/
  })
  .sort({ timestamp: -1 })
  .limit(100);
}
```

### Set Up Alerts

For critical failures:

```javascript
// In statusAutomationWorker.js
if (result.success === false) {
  // Send alert via Slack, email, etc.
  await notifyAdmins({
    message: `Status automation failed: ${result.error}`,
    severity: 'critical'
  });
}
```

### Log Retention

- Vercel: Uses Edge logs (available in dashboard)
- AWS Lambda: CloudWatch Logs
- Google Cloud: Stackdriver Logging
- Self-hosted: Configure logrotate

```bash
# logrotate config for self-hosted
/var/log/status-automation.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
}
```

## Testing

Run manually to test:

```bash
# Local
node scripts/runStatusAutomation.js

# With Vercel CLI
vercel env pull
node scripts/runStatusAutomation.js

# Docker
docker run --env-file .env myapp node scripts/runStatusAutomation.js
```

## Troubleshooting

### Automation not running

1. Check cron logs:
   ```bash
   # Linux
   sudo journalctl -u cron
   # macOS
   log stream --predicate 'process == "cron"'
   ```

2. Verify MongoDB connection:
   ```javascript
   // scripts/test-db.js
   import { connectToDatabase } from '@/lib/mongodb';
   await connectToDatabase();
   console.log('Database connected!');
   ```

3. Check for errors in automation logs

### Transitions not happening

1. Verify entities exist and haven't been completed
2. Check variation factors are being applied correctly
3. Review entity updated_at timestamps
4. Check condition functions in WORKFLOW_CONFIG

### High execution time

- Increase timeout limit
- Optimize database queries (add indexes)
- Consider splitting into smaller jobs
- Cache frequently accessed data

## Cost Considerations

- **Vercel Cron**: Free up to 50 invocations
- **AWS Lambda**: Free tier: 1M requests/month, 400,000 GB-seconds/month
- **Google Cloud Functions**: 2M free invocations/month
- **GitHub Actions**: 2,000 free minutes/month for public repos

## Best Practices

1. **Set appropriate frequency** - Hourly is usually sufficient
2. **Monitor execution time** - Keep under 60 seconds if possible
3. **Log all actions** - For debugging and compliance
4. **Handle failures gracefully** - Retry logic, don't crash
5. **Alert on errors** - Notify admins of failures
6. **Regular testing** - Test automation workflows
7. **Backup before running** - Especially on first deployment

## Next Steps

1. Choose your environment
2. Set up automation following the guide above
3. Configure environment variables
4. Test manually first
5. Monitor the first runs
6. Adjust schedules based on usage patterns
7. Set up monitoring and alerts
