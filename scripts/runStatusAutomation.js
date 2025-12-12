#!/usr/bin/env node

/**
 * Status Automation Worker Script
 * 
 * This script should be run periodically (e.g., every hour via cron, or as a scheduled job)
 * It processes:
 * - Automatic status transitions based on time conditions
 * - Escalation actions for statuses exceeding time thresholds
 * - Overdue task notifications
 * 
 * Usage:
 * - Node.js: node scripts/runStatusAutomation.js
 * - Cron: 0 * * * * cd /app && node scripts/runStatusAutomation.js
 * - Vercel Cron: Add to vercel.json
 * - AWS Lambda/Google Cloud: Wrap in serverless function
 */

const {
  processAllAutoTransitions,
  checkOverdueTasks
} = require('../lib/statusAutomationWorker');

const logging = {
  log: (msg) => console.log(`[${new Date().toISOString()}] ${msg}`),
  error: (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`)
};

async function runAutomation() {
  try {
    logging.log('Starting status automation worker...');

    // Process all auto-transitions
    logging.log('Processing auto-transitions...');
    const transitionResults = await processAllAutoTransitions();
    
    if (transitionResults.success || transitionResults.results) {
      logging.log(`Processed ${transitionResults.totalTransitioned} auto-transitions`);
      
      transitionResults.results.forEach(result => {
        if (result.success) {
          logging.log(`  - ${result.entityType}: ${result.transitioned} transitioned (${result.processed} checked)`);
        } else {
          logging.error(`  - ${result.entityType}: ${result.error}`);
        }
      });
    } else {
      logging.error(`Failed to process auto-transitions: ${transitionResults.error}`);
    }

    // Check for overdue tasks
    logging.log('Checking for overdue tasks...');
    const overdueResults = await checkOverdueTasks();
    
    if (overdueResults.success) {
      logging.log(`Found ${overdueResults.overdueTasks} overdue tasks`);
    } else {
      logging.error(`Failed to check overdue tasks: ${overdueResults.error}`);
    }

    logging.log('Status automation worker completed successfully');
    process.exit(0);

  } catch (error) {
    logging.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the automation
runAutomation();
