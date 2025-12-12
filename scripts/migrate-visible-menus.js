/**
 * Migration script to update all roles with correct visibleMenus
 * This ensures all roles have the sprints menu visible by default
 */

const mongoose = require('mongoose');

// Import the Role model
const Role = require('../models/Role').default;

const DEFAULT_VISIBLE_MENUS = {
  portfolio: true,
  projects: true,
  kanban: true,
  backlog: true,
  sprints: true,
  roadmap: true,
  tasks: true,
  files: true,
  comments: true,
  timesheets: true,
  budget: true,
  reports: true,
  notifications: true,
  admin: false
};

async function migrateVisibleMenus() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all roles
    const roles = await Role.find({});
    console.log(`\n📋 Found ${roles.length} role(s) to update\n`);

    let updated = 0;
    let skipped = 0;

    for (const role of roles) {
      // Check if visibleMenus exists and needs updating
      const needsUpdate = !role.visibleMenus || 
                          role.visibleMenus.sprints !== true ||
                          role.visibleMenus.backlog !== true ||
                          role.visibleMenus.roadmap !== true ||
                          role.visibleMenus.budget !== true ||
                          role.visibleMenus.reports !== true;

      if (needsUpdate) {
        // Merge existing visibleMenus with defaults
        const updatedMenus = {
          ...DEFAULT_VISIBLE_MENUS,
          ...role.visibleMenus,
          // Special cases: keep admin as false for non-admin roles
          admin: role.visibleMenus?.admin || false
        };

        role.visibleMenus = updatedMenus;
        await role.save();
        updated++;
        console.log(`✅ Updated: ${role.nom}`);
      } else {
        skipped++;
        console.log(`⏭️  Skipped: ${role.nom} (already correct)`);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`\n✨ Migration completed successfully!`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateVisibleMenus();
